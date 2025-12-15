'use server';

import { createClient } from '../../utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { resend } from '../../lib/resend';
import OrderShippedEmail from '../../components/emails/OrderShippedEmail';
import OrderReceivedEmail from '../../components/emails/OrderReceivedEmail';
import { ReactElement } from 'react';

// Admin Client for Privileged Operations (Fetching Emails)
const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

/**
 * Mark Order as Shipped
 * Access: Seller Only
 */
export async function markAsShipped(orderId: string, trackingNumber?: string, carrier?: string) {
    const supabase = await createClient(); // Standard Client for Auth/RLS check
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    // 1. Fetch Order and Verify Ownership
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select(`
            id,
            buyer_id,
            status,
            listing:listing_items (
                id, seller_id, series_name, player_name
            )
        `)
        .eq('id', orderId)
        .single();

    if (fetchError || !order) throw new Error('Order not found');

    // Verify Seller
    const listingDetail = Array.isArray(order.listing) ? order.listing[0] : order.listing;
    if (listingDetail.seller_id !== user.id) {
        throw new Error('Unauthorized: You are not the seller.');
    }

    // 2. Update Order Status (Using Admin to bypass RLS/Policy constraints)
    const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
            status: 'shipped',
            tracking_number: trackingNumber,
            carrier: carrier,
            shipped_at: new Date().toISOString()
        })
        .eq('id', orderId);

    if (updateError) throw new Error(updateError.message);

    // 3. Send Email to Buyer (requires Admin to fetch email)
    try {
        const { data: buyerUser, error: buyerError } = await supabaseAdmin.auth.admin.getUserById(order.buyer_id);

        if (buyerUser && buyerUser.user && buyerUser.user.email) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const { error: emailError } = await resend.emails.send({
                from: 'Stadium Card <notifications@resend.dev>',
                to: [buyerUser.user.email],
                subject: 'Your Item Has Been Shipped',
                react: OrderShippedEmail({
                    buyerName: buyerUser.user.user_metadata?.full_name || 'Collector',
                    productName: listingDetail.player_name || listingDetail.series_name,
                    trackingNumber,
                    carrier,
                    orderUrl: `${baseUrl}/orders/buy/${order.id}`,
                    baseUrl
                }) as ReactElement
            });
            if (emailError) console.error('Email Error:', emailError);
        }
    } catch (err) {
        console.error('Failed to send email:', err);
        // Do not throw error here, as status update succeeded
    }

    return { success: true };
}

/**
 * Mark Order as Received (Completed)
 * Access: Buyer Only
 * Effect: Unlocks Funds (by setting listing status to Completed)
 */
export async function markAsReceived(orderId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    // 1. Fetch Order details
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select(`
            id,
            buyer_id,
            listing_id,
            status,
            listing:listing_items (
                id, seller_id, series_name, player_name
            )
        `)
        .eq('id', orderId)
        .single();

    if (fetchError || !order) throw new Error('Order not found');

    // Verify Buyer
    if (order.buyer_id !== user.id) {
        throw new Error('Unauthorized: You are not the buyer.');
    }

    // 2. Call RPC to complete the order and unlock funds
    // We pass listing_id to RPC
    const { error: rpcError } = await supabase.rpc('complete_order', {
        p_listing_id: order.listing_id
    });

    if (rpcError) throw new Error(rpcError.message);

    // Also explicitly set completed_at (RPC might miss it if logic not updated)
    await supabaseAdmin.from('orders').update({
        completed_at: new Date().toISOString()
    }).eq('id', orderId);

    // Prepare Listing Detail safe access
    const listingDetail = Array.isArray(order.listing) ? order.listing[0] : order.listing;

    // 3. Send Email to Seller (Funds Added Notification) & Auto-Clone
    try {
        const { data: sellerUser, error: sellerError } = await supabaseAdmin.auth.admin.getUserById(listingDetail.seller_id);

        if (sellerUser && sellerUser.user && sellerUser.user.email) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

            // 4. Auto-Clone Item for Buyer (as Draft)
            const { data: originalItem } = await supabaseAdmin
                .from('listing_items')
                .select('*')
                .eq('id', order.listing_id)
                .single();

            if (originalItem) {
                const { error: cloneError } = await supabaseAdmin
                    .from('listing_items')
                    .insert({
                        seller_id: user.id, // The Buyer becomes the new Seller
                        status: 'Draft',
                        player_name: originalItem.player_name,
                        team: originalItem.team,
                        year: originalItem.year,
                        manufacturer: originalItem.manufacturer,
                        series_name: originalItem.series_name,
                        card_number: originalItem.card_number,
                        images: originalItem.images,
                        grading_service: originalItem.grading_service,
                        condition_rating: originalItem.condition_rating,
                        condition_grading: originalItem.condition_grading,
                        price: 0 // Reset price
                    });

                if (cloneError) {
                    console.error('Failed to auto-clone item for buyer:', cloneError);
                }
            }

            // 5. Send Email to Seller
            const { error: emailError } = await resend.emails.send({
                from: 'Trade Card App <onboarding@resend.dev>',
                to: [sellerUser.user.email],
                subject: 'Transaction Completed: Funds Added',
                react: OrderReceivedEmail({
                    sellerName: sellerUser.user.user_metadata?.full_name || 'Seller',
                    productName: listingDetail.player_name || listingDetail.series_name,
                    payoutUrl: `${baseUrl}/payouts`
                }) as ReactElement
            });
            if (emailError) console.error('Email Error:', emailError);
        }
    } catch (err) {
        console.error('Failed to send email:', err);
    }

    return { success: true };
}


/**
 * Fetch Order Details for Seller (Bypassing RLS)
 */
export async function getSellerOrderDetails(orderId: string) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY is missing.');
        throw new Error('Server configuration error');
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    console.log('Fetching order (Seller):', orderId);

    // 1. Fetch Order (No Join)
    const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (orderError || !order) {
        console.error('Admin Fetch Order Error:', JSON.stringify(orderError));
        throw new Error('Order not found in database');
    }

    // 2. Fetch Listing (Manual Join)
    const { data: listing, error: listingError } = await supabaseAdmin
        .from('listing_items')
        .select('series_name, player_name, images, price, seller_id')
        .eq('id', order.listing_id)
        .single();

    if (listingError || !listing) {
        console.error('Admin Fetch Listing Error:', JSON.stringify(listingError));
        throw new Error('Associated listing not found');
    }

    // Explicit Ownership Check
    if (listing.seller_id !== user.id) {
        throw new Error('Unauthorized: You are not the seller.');
    }

    // Combine
    return {
        ...order,
        listing: {
            ...listing,
            title: listing.series_name || listing.player_name
        }
    };
}

/**
 * Fetch Order Details for Buyer (Bypassing RLS)
 */
export async function getBuyerOrderDetails(orderId: string) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY is missing.');
        throw new Error('Server configuration error');
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    // 1. Fetch Order
    const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (orderError || !order) {
        console.error('Admin Fetch Order (Buyer) Error:', JSON.stringify(orderError));
        throw new Error('Order not found');
    }

    // Verify Buyer
    if (order.buyer_id !== user.id) {
        throw new Error('Unauthorized: You are not the buyer.');
    }

    // 2. Fetch Listing
    const { data: listing, error: listingError } = await supabaseAdmin
        .from('listing_items')
        .select('series_name, player_name, images, price, seller_id, status')
        .eq('id', order.listing_id)
        .single();

    if (listingError || !listing) {
        throw new Error('Listing details not found');
    }

    return {
        ...order,
        listing: {
            ...listing,
            title: listing.series_name || listing.player_name
        }
    };
}
