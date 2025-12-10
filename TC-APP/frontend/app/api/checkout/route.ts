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
            .select('*, catalog:card_catalogs(*)')
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

        // 3. Create Pending Order in DB
        // We use upsert or plain insert. Since logic should be one pending order per user/listing combo ideally,
        // but for now simple insert. RLS allows buyers to insert orders.
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                listing_id: listingId,
                buyer_id: user.id,
                payment_method_id: 'stripe_checkout', // placeholder until payment
                total_amount: listing.price,
                status: 'pending' // pending until webhook confirms
            })
            .select()
            .single();

        if (orderError) {
            console.error('Order creation failed:', orderError);
            return NextResponse.json({ error: 'Failed to create order record' }, { status: 500 });
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
                            name: `${listing.catalog.player_name} - ${listing.catalog.rarity}`,
                            description: `${listing.catalog.series_name} (#${listing.catalog.card_number})`,
                            images: listing.images && listing.images.length > 0 ? [listing.images[0]] : [],
                            metadata: {
                                listing_id: listingId,
                                catalog_id: listing.catalog_id
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
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/${listingId}?canceled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        console.error('Stripe Checkout Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
