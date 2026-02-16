import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import { createClient } from '../../../utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const { listingId, returnUrl, shippingDetails } = await req.json();
        const supabase = await createClient();

        // 1. Auth Check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch Listing Details
        const { data: listing, error: listingError } = await supabase
            .from('listing_items')
            .select('*')
            .eq('id', listingId)
            .single();

        if (listingError || !listing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        if (listing.status !== 'Active') {
            return NextResponse.json({ error: 'Listing is not active' }, { status: 400 });
        }

        if (listing.seller_id === user.id) {
            return NextResponse.json({ error: 'Cannot purchase your own listing' }, { status: 400 });
        }

        // 2.5 Fetch Active Live Moment (Snapshot)
        // Check for moments in the last 1 hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: recentMoments } = await supabase
            .from('live_moments')
            .select('*')
            .gt('created_at', oneHourAgo);

        // Filter by Player Name (Fuzzy Match)
        const listingPlayer = (listing.player_name || '').toLowerCase();

        const matchedMoments = recentMoments?.filter(m => {
            const momentPlayer = (m.player_name || '').toLowerCase();
            return listingPlayer.includes(momentPlayer) || momentPlayer.includes(listingPlayer);
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];

        // Snapshot ALL matched moments (Multiple Moments Support)
        const momentSnapshot = matchedMoments.length > 0 ? matchedMoments : null;

        // 3. Create or Reuse Pending Order
        // Build Admin Client for cross-user reservation check
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Check for any order for this listing that is effectively "locked"
        // Statuses that block a new checkout: pending, paid, awaiting_shipping, shipped
        const { data: activeOrders, error: fetchOrderError } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('listing_id', listingId)
            .in('status', ['pending', 'paid', 'awaiting_shipping', 'shipped']);

        if (fetchOrderError) {
            console.error('Fetch Order Error:', fetchOrderError);
        }

        const existingMyOrder = activeOrders?.find(o => o.buyer_id === user.id);
        const someoneElseActiveOrder = activeOrders?.find(o => o.buyer_id !== user.id);

        let order = null;

        if (someoneElseActiveOrder) {
            // If someone else has an active transaction (pending or paid), we are blocked.
            const errorMsg = ['paid', 'awaiting_shipping', 'shipped'].includes(someoneElseActiveOrder.status)
                ? 'This item has already been sold.'
                : 'Item is currently in a transaction.';
            return NextResponse.json({ error: errorMsg }, { status: 400 });
        }

        if (existingMyOrder) {
            // If we have a pending order, we reuse it.
            // Update shipping details AND refresh moment snapshot
            const updateData: any = {
                moment_snapshot: momentSnapshot
            };

            if (shippingDetails) {
                updateData.shipping_name = shippingDetails.name;
                updateData.shipping_postal_code = shippingDetails.postalCode;
                updateData.shipping_address = shippingDetails.address;
                updateData.shipping_phone = shippingDetails.phone;
            }

            await supabaseAdmin.from('orders').update(updateData).eq('id', existingMyOrder.id);
            order = { ...existingMyOrder, ...updateData };
        } else {
            // No active order for us. Create a new one.
            // 手数料率の取得と計算（環境変数ベース）
            const feeRate = parseFloat(process.env.PLATFORM_FEE_RATE || '0.10');
            const platformFee = Math.floor(listing.price * feeRate);
            const netEarnings = listing.price - platformFee;

            const { data: newOrder, error: insertError } = await supabaseAdmin
                .from('orders')
                .insert({
                    listing_id: listingId,
                    buyer_id: user.id,
                    seller_id: listing.seller_id,
                    payment_method_id: 'stripe_checkout',
                    total_amount: listing.price,
                    fee_rate: feeRate,
                    platform_fee: platformFee,
                    net_earnings: netEarnings,
                    status: 'pending',
                    shipping_name: shippingDetails?.name,
                    shipping_postal_code: shippingDetails?.postalCode,
                    shipping_address: shippingDetails?.address,
                    shipping_phone: shippingDetails?.phone,
                    moment_snapshot: momentSnapshot
                })
                .select()
                .single();

            if (insertError) {
                if (insertError.code === '23505') {
                    return NextResponse.json({ error: 'Item is currently reserved by another user.' }, { status: 409 });
                }
                console.error('Order creation failed:', insertError);
                return NextResponse.json({
                    error: `Failed to create order record: ${insertError.message}`
                }, { status: 500 });
            }
            order = newOrder;
        }

        // 3.5 Lock the listing as TransactionPending (remove from marketplace immediately)
        const { error: reserveError } = await supabaseAdmin
            .from('listing_items')
            .update({ status: 'TransactionPending', updated_at: new Date().toISOString() })
            .eq('id', listingId)
            .eq('status', 'Active');

        if (reserveError) {
            console.error('[Checkout] Failed to reserve listing:', reserveError.message);
            // Non-fatal: proceed with checkout even if reserve fails
        } else {
            console.log(`[Checkout] Listing ${listingId} set to TransactionPending`);
        }

        // 4. Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'jpy',
                        product_data: {
                            name: `${listing.player_name || 'Card'}`,
                            description: `${listing.series_name || ''} (#${listing.card_number || '---'})`,
                            images: listing.images && listing.images.length > 0 ? [listing.images[0]] : [],
                            metadata: {
                                listing_id: listingId,
                            }
                        },
                        unit_amount: listing.price,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                userId: user.id,
                listingId: listingId,
                orderId: order.id, // Store our internal order ID to update it later
            },
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${order.id}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/${listingId}?canceled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        console.error('Stripe Checkout Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
