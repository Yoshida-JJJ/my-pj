'use server';

import { createClient } from '../../utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { resend } from '../../lib/resend';
import OrderShippedEmail from '../../components/emails/OrderShippedEmail';
import OrderReceivedEmail from '../../components/emails/OrderReceivedEmail';
import { ReactElement } from 'react';

// Admin Client for Privileged Operations (Fetching Emails)
// Helper to get Admin Client safely
function getAdminClient() {
    console.log("[Debug] getAdminClient called. Checking env vars...");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY is missing/undefined in Vercel environment.");
        throw new Error('Server Config Error: SUPABASE_SERVICE_ROLE_KEY is missing.');
    }
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}

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
            seller_id,
            status,
            listing:listing_items!listing_id (
                id, seller_id, series_name, player_name
            )
        `)
        .eq('id', orderId)
        .single();

    if (fetchError || !order) throw new Error('Order not found');

    // Verify Seller
    const listingDetail = Array.isArray(order.listing) ? order.listing[0] : order.listing;

    console.log(`[Debug markAsShipped] Order: ${orderId}, User: ${user.id}, ListingSeller: ${listingDetail?.seller_id}, OrderSeller: ${order.seller_id}`);

    const isListingSeller = listingDetail.seller_id === user.id;
    const isOrderSeller = order.seller_id === user.id;

    if (!isListingSeller && !isOrderSeller) {
        const msg = `[Debug] Unauthorized: Seller ID mismatch. UserID=${user.id}, ListingSellerID=${listingDetail.seller_id}, OrderSellerID=${order.seller_id}`;
        console.error(msg);
        throw new Error(msg);
    }

    // 2. Update Order Status (Using Admin to bypass RLS/Policy constraints)
    const { error: updateError } = await getAdminClient()
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
        const { data: buyerUser, error: buyerError } = await getAdminClient().auth.admin.getUserById(order.buyer_id);

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
            listing:listing_items!listing_id (
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
    await getAdminClient().from('orders').update({
        completed_at: new Date().toISOString()
    }).eq('id', orderId);

    // --- Unlock Item for Buyer's Workspace ---
    try {
        const { getBuyerItemByOrder } = await import('./item');
        const buyerItemData = await getBuyerItemByOrder(orderId);
        if (buyerItemData?.id) {
            console.log(`[markAsReceived] Unlocking item ${buyerItemData.id} for buyer.`);
            await getAdminClient()
                .from('listing_items')
                .update({
                    status: 'Draft',
                    origin_order_id: orderId // Ensure link is set even if webhook failed
                })
                .eq('id', buyerItemData.id)
                .in('status', ['Incoming', 'AwaitingShipment', 'Active']); // Added 'Active' safety net
        }
    } catch (unlockErr) {
        console.error('[markAsReceived] Failed to unlock item:', unlockErr);
    }

    // Prepare Listing Detail safe access
    const listingDetail = Array.isArray(order.listing) ? order.listing[0] : order.listing;

    // 3. Send Email to Seller (Funds Added Notification) & Auto-Clone
    try {
        const { data: sellerUser, error: sellerError } = await getAdminClient().auth.admin.getUserById(listingDetail.seller_id);

        if (sellerUser && sellerUser.user && sellerUser.user.email) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

            // 4. Send Email to Seller
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
    const { data: order, error: orderError } = await getAdminClient()
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (orderError || !order) {
        console.error('Admin Fetch Order Error:', JSON.stringify(orderError));
        throw new Error('Order not found in database');
    }

    // 2. Fetch Listing (Manual Join)
    const { data: listing, error: listingError } = await getAdminClient()
        .from('listing_items')
        .select('id, series_name, player_name, images, price, seller_id')
        .eq('id', order.listing_id)
        .single();

    if (listingError || !listing) {
        console.error('Admin Fetch Listing Error:', JSON.stringify(listingError));
        throw new Error('Associated listing not found');
    }

    // Explicit Ownership Check
    console.log(`[Debug getSellerOrderDetails] Order: ${orderId}, User: ${user.id}, Seller: ${listing.seller_id}, OrderSeller: ${order.seller_id}`);

    const isListingSeller = listing.seller_id === user.id;
    const isOrderSeller = order.seller_id === user.id;

    if (!isListingSeller && !isOrderSeller) {
        const msg = `[Debug] Unauthorized: Seller ID mismatch in getSellerOrderDetails. UserID=${user.id}, ListingSellerID=${listing.seller_id}, OrderSellerID=${order.seller_id}`;
        console.error(msg);
        throw new Error(msg);
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
    const { data: order, error: orderError } = await getAdminClient()
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
    const { data: listing, error: listingError } = await getAdminClient()
        .from('listing_items')
        .select('id, series_name, player_name, images, price, seller_id, status, moment_history')
        .eq('id', order.listing_id)
        .single();

    if (listingError || !listing) {
        console.error('Fetch Listing Error:', listingError);
        throw new Error(`Listing details not found: ${listingError?.message || 'Unknown error'}`);
    }

    return {
        ...order,
        listing: {
            ...listing,
            title: listing.series_name || listing.player_name
        }
    };
}

/**
 * Fetch All Orders for Seller
 */
export async function getSellerOrders() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await getAdminClient()
        .from('orders')
        .select(`
            id,
            status,
            total_amount,
            fee_rate,
            platform_fee,
            net_earnings,
            created_at,
            completed_at,
            listing:listing_items!listing_id (
                player_name, images, series_name, manufacturer, year
            )
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching seller orders:', error);
        return [];
    }

    return data.map((order: any) => ({
        ...order,
        listing: Array.isArray(order.listing) ? order.listing[0] : order.listing
    }));
}

/**
 * Fetch All Orders for Buyer
 */
export async function getBuyerOrders() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await getAdminClient()
        .from('orders')
        .select(`
            id,
            status,
            total_amount,
            created_at,
            completed_at,
            seller_id,
            seller:profiles!seller_id (
                display_name
            ),
            listing:listing_items!listing_id (
                player_name, images, series_name, manufacturer, year
            )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching buyer orders:', error);
        return [];
    }

    return data.map((order: any) => ({
        ...order,
        seller: Array.isArray(order.seller) ? order.seller[0] : order.seller,
        listing: Array.isArray(order.listing) ? order.listing[0] : order.listing
    }));
}

// ===== 共通の注文取得ベース（内部関数） =====

interface OrderHistoryOptions {
    statusFilter?: 'all' | 'completed';
}

async function fetchOrders(
    role: 'seller' | 'buyer',
    options: OrderHistoryOptions = { statusFilter: 'all' }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const selectFields = role === 'buyer'
        ? `
            id,
            status,
            total_amount,
            fee_rate,
            platform_fee,
            net_earnings,
            created_at,
            completed_at,
            seller_id,
            seller:profiles!seller_id (
                display_name
            ),
            listing:listing_items!listing_id (
                id, player_name, images, series_name, manufacturer, year
            )
        `
        : `
            id,
            status,
            total_amount,
            fee_rate,
            platform_fee,
            net_earnings,
            created_at,
            completed_at,
            listing:listing_items!listing_id (
                id, player_name, images, series_name, manufacturer, year
            )
        `;

    let query = getAdminClient()
        .from('orders')
        .select(selectFields)
        .eq(role === 'seller' ? 'seller_id' : 'buyer_id', user.id)
        .order('created_at', { ascending: false });

    // ステータスフィルタ
    if (options.statusFilter === 'completed') {
        query = query.eq('status', 'completed');
    }

    const { data, error } = await query;

    if (error) {
        console.error(`Error fetching ${role} orders:`, error);
        return [];
    }

    return (data || []).map((order: any) => ({
        ...order,
        seller: Array.isArray(order.seller) ? order.seller[0] : order.seller,
        listing: Array.isArray(order.listing) ? order.listing[0] : order.listing,
    }));
}

/**
 * 完了済み販売履歴の取得
 * 用途: /collection の Sold History, /payouts の売上明細
 */
export async function getCompletedSales() {
    return fetchOrders('seller', { statusFilter: 'completed' });
}

/**
 * 完了済み購入履歴の取得
 * 用途: /collection の Purchase History
 */
export async function getCompletedPurchases() {
    return fetchOrders('buyer', { statusFilter: 'completed' });
}
