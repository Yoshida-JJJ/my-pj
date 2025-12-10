import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';
import { headers } from 'next/headers';
import Stripe from 'stripe';

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

        const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
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
        const { error: listingError } = await supabaseAdmin
            .from('listing_items')
            .update({ status: 'AwaitingShipment' })
            .eq('id', listingId);

        if (listingError) {
            console.error('Error updating listing:', listingError);
            return NextResponse.json({ error: 'DB Error' }, { status: 500 });
        }

        console.log(`Order ${orderId} completed successfully.`);
    }

    return NextResponse.json({ received: true });
}
