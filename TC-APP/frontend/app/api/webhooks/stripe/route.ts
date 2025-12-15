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
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;

        // Retrieve metadata
        const md = session.metadata;
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

        // 2. Update Listing Status to 'AwaitingShipment'
        // Also select seller_id, title, price for email
        const { data: updatedListing, error: listingError } = await supabaseAdmin
            .from('listing_items')
            .update({ status: 'AwaitingShipment' })
            .eq('id', listingId)
            .select('seller_id, player_name, series_name, price')
            .single();

        if (listingError || !updatedListing) {
            console.error('Error updating listing:', listingError);
            return NextResponse.json({ error: 'DB Error' }, { status: 500 });
        }

        // 3. Send Email to Seller (Shipping Request)
        try {
            const { data: sellerUser, error: sellerError } = await supabaseAdmin.auth.admin.getUserById(updatedListing.seller_id);

            if (sellerUser && sellerUser.user && sellerUser.user.email) {
                if (!process.env.RESEND_API_KEY) {
                    console.error('RESEND_API_KEY is missing. Skipping email.');
                } else {
                    console.log(`Attempting to send email to ${sellerUser.user.email} from onboarding@resend.dev`);
                    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

                    const { error: emailError } = await resend.emails.send({
                        from: 'Stadium Card <onboarding@resend.dev>',
                        to: [sellerUser.user.email],
                        subject: 'Item Sold - Shipping Required',
                        react: ShippingRequestEmail({
                            sellerName: sellerUser.user.user_metadata?.full_name || 'Seller',
                            productName: updatedListing.player_name || updatedListing.series_name,
                            orderUrl: `${baseUrl}/orders/sell/${orderId}`
                        }) as ReactElement
                    });

                    if (emailError) {
                        console.error('Failed to send shipping request email:', emailError);
                    } else {
                        console.log(`Shipping request email sent to ${sellerUser.user.email}`);
                    }
                }
            }
        } catch (emailErr) {
            console.error('Unexpected error sending email:', emailErr);
        }

        // 4. Send Email to Buyer (Order Confirmation)
        try {
            // Need to fetch order to get buyer_id
            const { data: orderData } = await supabaseAdmin
                .from('orders')
                .select('buyer_id')
                .eq('id', orderId)
                .single();

            if (orderData && orderData.buyer_id) {
                const { data: buyerUser } = await supabaseAdmin.auth.admin.getUserById(orderData.buyer_id);

                if (buyerUser && buyerUser.user && buyerUser.user.email) {
                    if (process.env.RESEND_API_KEY) {
                        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
                        console.log(`Sending buyer confirmation to ${buyerUser.user.email}`);

                        const { error: buyerEmailError } = await resend.emails.send({
                            from: 'Stadium Card <onboarding@resend.dev>',
                            to: [buyerUser.user.email],
                            subject: 'Order Confirmed',
                            react: OrderConfirmationEmail({
                                buyerName: buyerUser.user.user_metadata?.full_name || 'Collector',
                                productName: updatedListing.player_name || updatedListing.series_name,
                                price: updatedListing.price,
                                orderUrl: `${baseUrl}/orders/buy/${orderId}`
                            }) as ReactElement
                        });

                        if (buyerEmailError) {
                            console.error('Failed to send buyer confirmation email:', buyerEmailError);
                        } else {
                            console.log(`Buyer confirmation email sent to ${buyerUser.user.email}`);
                        }
                    }
                }
            }
        } catch (buyerErr) {
            console.error('Unexpected error sending buyer email:', buyerErr);
        }

        console.log(`Order ${orderId} completed successfully.`);
    }

    return NextResponse.json({ received: true });
}

