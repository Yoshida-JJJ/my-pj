import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { ReactElement } from 'react';
import ShippingRequestEmail from '../../../../components/emails/ShippingRequestEmail';
import OrderConfirmationEmail from '../../../../components/emails/OrderConfirmationEmail';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY!);

// This is required for the webhook to receive the raw body
// Not needed in App Router since we consume req.text() directly? 
// Actually, standard Next.js API routes needed bodyParser: false. 
// App Router handlers receive Request, we can read body.

export async function POST(req: NextRequest) {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
        console.log(`[Webhook] Signature verified. Event Type: ${event.type}`);
    } catch (err: any) {
        console.error(`[Webhook] Signature verification failed: ${err.message}`);
        return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;

        // Retrieve metadata
        const md = session.metadata;
        console.log('[Webhook] Session Metadata:', md);

        const orderId = md?.orderId;
        const listingId = md?.listingId;

        if (!orderId || !listingId) {
            console.error('Webhook metadata missing orderId or listingId');
            return NextResponse.json({ error: 'Metadata missing' }, { status: 400 });
        }


        console.log(`Processing Order ${orderId} for Listing ${listingId}`);

        // 1. Update Order Status to 'paid'
        // Need to use service_role key ideally to bypass RLS if user is not logged in context?
        // Webhook is server-to-server. 'createClient()' uses cookie based auth usually.
        // HERE IS A PROBLEM: 'createClient' from utils/supabase/server relies on cookies.
        // Webhook requests DO NOT have user cookies.
        // We MUST use a Supabase Admin Client (Service Role) here.

        // I need to instantiate a Supabase client with SERVICE_ROLE_KEY.
        // Since I don't have a dedicated utility for admin client yet, I will create one inline or add to utils.
        // User has `process.env.SUPABASE_SERVICE_ROLE_KEY`? Usually yes in Supabase projects.
        // I'll check env vars later, but assuming standard setup.

        // Wait, I cannot see `utils/supabase/server.ts` imports easily to check if it supports admin.
        // I'll stick to creating a fresh client via `createClient` from `@supabase/supabase-js`.
        // I need to import `createClient` from package, not the helper.

        // 5. Create Admin Client
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY is missing.');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Update Order
        const { error: orderError } = await supabaseAdmin
            .from('orders')
            .update({
                status: 'paid',
                payment_method_id: session.payment_intent as string || 'stripe'
            })
            .eq('id', orderId);

        if (orderError) {
            console.error('Error updating order:', orderError);
            return NextResponse.json({ error: 'DB Error' }, { status: 500 });
        }

        // 2. Fetch Listing, Active Moment & Order Data
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        // Parallel fetch: Listing + Active Moments + Order (for buyer_id)
        const [listingResult, momentsResult, orderResult] = await Promise.all([
            supabaseAdmin
                .from('listing_items')
                .select('*') // Select all for cloning
                .eq('id', listingId)
                .single(),
            supabaseAdmin
                .from('live_moments')
                .select('*')
                .gt('created_at', oneHourAgo)
                .order('created_at', { ascending: false }),
            supabaseAdmin
                .from('orders')
                .select('id, moment_snapshot, buyer_id')
                .eq('id', orderId)
                .single()
        ]);

        const listingData = listingResult.data;
        const recentMoments = momentsResult.data || [];
        const currentOrder = orderResult.data;

        if (listingResult.error || !listingData || !currentOrder) {
            console.error('Error fetching data for cloning/moment matching:', listingResult.error || orderResult.error);
            return NextResponse.json({ error: 'DB Fetch Error' }, { status: 500 });
        }

        // 5. Transfer Ownership (Persistent ID Model)
        // Instead of cloning, we update the existing item's seller_id to the buyer_id
        // and set status to AwaitingShipment.
        const buyerId = currentOrder.buyer_id;
        const listing = listingData; // Rename for clarity in new logic
        console.log(`[Webhook] Transferring item ${listing.id} to buyer ${buyerId}`);

        const { error: transferError } = await supabaseAdmin
            .from('listing_items')
            .update({
                seller_id: buyerId,
                status: 'AwaitingShipment',
                origin_order_id: orderId, // Link for status tracking
                updated_at: new Date().toISOString()
            })
            .eq('id', listing.id);

        if (transferError) {
            console.error('[Webhook] CRITICAL: Failed to transfer ownership:', transferError.message);
            // We don't return 500 here because the payment was successful, 
            // but we need to track this failure.
        } else {
            console.log(`[Webhook] Successfully transferred ownership of item ${listing.id} to ${buyerId}`);
        }

        // 6. Record Seller in Order (For History)
        // Update the order with the original seller's ID before it was changed.
        const { error: orderUpdateError } = await supabaseAdmin
            .from('orders')
            .update({ seller_id: listing.seller_id })
            .eq('id', orderId);

        if (orderUpdateError) {
            console.error('[Webhook] Failed to record seller_id in order:', orderUpdateError.message);
        }

        // 7. Moment Syncing (Now on the transferred item)
        // Prefer captured snapshot from the order, fallback to live lookup ONLY if snapshot is missing
        let momentsToRecord = [];
        if (currentOrder.moment_snapshot) {
            console.log(`[Webhook Sync] Using captured snapshot (${Array.isArray(currentOrder.moment_snapshot) ? currentOrder.moment_snapshot.length : 1} moments) for item ${listing.id}`);
            momentsToRecord = Array.isArray(currentOrder.moment_snapshot) ? currentOrder.moment_snapshot : [currentOrder.moment_snapshot];
        } else {
            console.log(`[Webhook Sync] No snapshot found in order ${orderId}. Falling back to live lookup.`);
            const listingPlayer = (listing.player_name || '').toLowerCase();
            momentsToRecord = recentMoments.filter(m => {
                const momentPlayer = (m.player_name || '').toLowerCase();
                return listingPlayer.includes(momentPlayer) || momentPlayer.includes(listingPlayer);
            });
        }

        // Prepare History for Transferred Item
        const originalHistory = Array.isArray(listingData.moment_history) ? listingData.moment_history : [];

        // Filter out moments that are already present in the history (prevent duplicates from self-healing)
        const uniqueMomentsToRecord = momentsToRecord.filter(nm =>
            !originalHistory.some((oh: any) => (oh.moment_id === nm.id) || (oh.id === nm.id))
        );

        const newHistoryItems = uniqueMomentsToRecord.map(m => ({
            moment_id: m.id,
            timestamp: new Date().toISOString(),
            title: m.title,
            player_name: m.player_name,
            intensity: m.intensity,
            description: m.description,
            match_result: m.match_result,
            owner_at_time: orderId,
            status: m.is_finalized ? 'finalized' : 'pending'
        }));

        const fullBuyerHistory = [...originalHistory, ...newHistoryItems];

        // Update the item history
        if (newHistoryItems.length > 0) {
            console.log(`[Webhook] Appending ${newHistoryItems.length} moments to transferred item ${listing.id}`);
            await supabaseAdmin
                .from('listing_items')
                .update({ moment_history: fullBuyerHistory })
                .eq('id', listing.id);
        }

        // 3. Send Email to Seller (Shipping Request) - Using original listing data
        try {
            const { data: sellerUser } = await supabaseAdmin.auth.admin.getUserById(listingData.seller_id);

            if (sellerUser && sellerUser.user && sellerUser.user.email) {
                if (process.env.RESEND_API_KEY) {
                    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
                    await resend.emails.send({
                        from: 'Stadium Card <onboarding@resend.dev>',
                        to: [sellerUser.user.email],
                        subject: 'Item Sold - Shipping Required',
                        react: ShippingRequestEmail({
                            sellerName: sellerUser.user.user_metadata?.full_name || 'Seller',
                            productName: listingData.player_name || listingData.series_name,
                            orderUrl: `${baseUrl}/orders/sell/${orderId}`
                        }) as ReactElement
                    });
                }
            }
        } catch (emailErr) {
            console.error('Unexpected error sending shipping request email:', emailErr);
        }

        // 4. Send Email to Buyer (Order Confirmation)
        try {
            const { data: buyerUser } = await supabaseAdmin.auth.admin.getUserById(currentOrder.buyer_id);

            if (buyerUser && buyerUser.user && buyerUser.user.email) {
                if (process.env.RESEND_API_KEY) {
                    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
                    await resend.emails.send({
                        from: 'Stadium Card <onboarding@resend.dev>',
                        to: [buyerUser.user.email],
                        subject: 'Order Confirmed',
                        react: OrderConfirmationEmail({
                            buyerName: buyerUser.user.user_metadata?.full_name || 'Collector',
                            productName: listingData.player_name || listingData.series_name,
                            price: listingData.price,
                            orderUrl: `${baseUrl}/orders/buy/${orderId}`
                        }) as ReactElement
                    });
                }
            }
        } catch (buyerErr) {
            console.error('Unexpected error sending buyer confirmation email:', buyerErr);
        }

        console.log(`Order ${orderId} completed successfully (webhook logic).`);
    }

    return NextResponse.json({ received: true });
}

