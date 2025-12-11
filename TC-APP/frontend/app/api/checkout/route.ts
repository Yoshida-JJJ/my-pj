import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import { createClient } from '../../../utils/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const { listingId, returnUrl } = await req.json();
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

        // 3. Create or Reuse Pending Order
        // Check if an order already exists for this listing
        const { data: existingOrder, error: fetchOrderError } = await supabase
            .from('orders')
            .select('*')
            .eq('listing_id', listingId)
            .maybeSingle();

        let order = existingOrder;

        if (existingOrder) {
            // If order exists
            if (existingOrder.status === 'paid' || existingOrder.status === 'completed') {
                return NextResponse.json({ error: 'This item has already been sold.' }, { status: 400 });
            }

            // If it's someone else's pending order (and RLS allowed us to see it? RLS usually hides it)
            // If RLS works, we only see OUR orders.
            // But if listing_id is unique, and we can't see the order, the INSERT below will fail with constraint error.
            if (existingOrder.buyer_id !== user.id) {
                // Should technically typically invalid if we can see it but it's not ours (depends on RLS)
                return NextResponse.json({ error: 'Item is currently in a transaction.' }, { status: 400 });
            }

            // If it's our pending order, we reuse it.
            // Optionally update timestamp or total_amount if price changed?
            // For now, just reuse.
        } else {
            // No visible order found. Try to insert.
            const { data: newOrder, error: insertError } = await supabase
                .from('orders')
                .insert({
                    listing_id: listingId,
                    buyer_id: user.id,
                    payment_method_id: 'stripe_checkout',
                    total_amount: listing.price,
                    status: 'pending'
                })
                .select()
                .single();

            if (insertError) {
                // If insert failed, it might be a unique constraint violation from a HIDDEN order (someone else's)
                if (insertError.code === '23505') { // Unique violation
                    return NextResponse.json({ error: 'Item is currently reserved by another user.' }, { status: 409 });
                }
                console.error('Order creation failed:', insertError);
                return NextResponse.json({ error: 'Failed to create order record' }, { status: 500 });
            }
            order = newOrder;
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
