'use server';

import { createClient as createServerClient } from '../../utils/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

const getAdminClient = () => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Server Config Error: SUPABASE_SERVICE_ROLE_KEY is missing.');
    }
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
};

/**
 * Soft delete an item
 */
export async function deleteItem(itemId: string) {
    console.log(`[Soft Delete] Archive Request: ${itemId}`);

    const { error } = await getAdminClient()
        .from('listing_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', itemId);

    if (error) {
        throw new Error(`Failed to archive item: ${error.message}`);
    }

    revalidatePath('/collection');
    return { success: true };
}

/**
 * Restore a soft-deleted item
 */
export async function restoreItem(itemId: string) {
    console.log(`[Soft Delete] Restore Request: ${itemId}`);

    const { error } = await getAdminClient()
        .from('listing_items')
        .update({ deleted_at: null })
        .eq('id', itemId);

    if (error) {
        throw new Error(`Failed to restore item: ${error.message}`);
    }

    revalidatePath('/collection');
    return { success: true };
}

/**
 * Add a memory note to a specific moment in the card's history
 */
// Old tagMomentMemory is deprecated/replaced by addMomentMemory
// We keep it temporarily if needed but essentially we are moving lightly.

/**
 * Delete a memory note (Set to null/empty)
 * Only the author of the note can delete it.
 */
/**
 * Add a new memory to the timeline
 */
export async function addMomentMemory(itemId: string, momentIndex: number, text: string, momentId?: string) {
    if (text.length > 150) throw new Error('Note must be less than 150 characters');

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // 1. Fetch Item
    const { data: item, error: fetchError } = await getAdminClient()
        .from('listing_items')
        .select('seller_id, moment_history, player_name')
        .eq('id', itemId)
        .single();

    if (fetchError || !item) throw new Error('Item not found');

    // Permission Check: Owner OR Current Buyer
    if (item.seller_id !== user.id) {
        const { data: order } = await getAdminClient()
            .from('orders')
            .select('id')
            .eq('listing_id', itemId)
            .eq('buyer_id', user.id)
            .neq('status', 'cancelled')
            .maybeSingle();

        if (!order) {
            throw new Error('Only the item owner or its buyer can record memories');
        }
    }

    // 2. Prepare History
    let history = [...(item.moment_history || [])];

    let targetIndex = momentIndex;
    if (momentId) {
        let foundIndex = history.findIndex((m: any) => m.moment_id === momentId);

        // --- SELF-HEALING (RESTORED & ENHANCED) ---
        // If not in item history, check if it's in a relevant order snapshot
        if (foundIndex === -1) {
            console.log(`[addMomentMemory] Moment ${momentId} not in item history. Checking order snapshots...`);
            const { data: order } = await getAdminClient()
                .from('orders')
                .select('id, moment_snapshot')
                .eq('listing_id', itemId)
                .eq('buyer_id', user.id)
                .neq('status', 'cancelled')
                .maybeSingle();

            if (order && order.moment_snapshot) {
                const snapshots = Array.isArray(order.moment_snapshot) ? order.moment_snapshot : [order.moment_snapshot];
                const snap = snapshots.find((s: any) => s.id === momentId);

                if (snap) {
                    console.log(`[Healing] Stamping missing snapshot ${momentId} to item ${itemId} before adding memory.`);
                    const newMomentEntry = {
                        moment_id: snap.id,
                        timestamp: new Date().toISOString(),
                        title: snap.title,
                        player_name: snap.player_name,
                        intensity: snap.intensity,
                        description: snap.description,
                        match_result: snap.match_result,
                        owner_at_time: order.id,
                        status: snap.is_finalized ? 'finalized' : 'pending'
                    };
                    history.push(newMomentEntry);
                    foundIndex = history.length - 1;
                }
            }
        }

        if (foundIndex !== -1) {
            targetIndex = foundIndex;
        } else {
            // Still not found, and index is out of bounds or invalid
            if (targetIndex < 0 || targetIndex >= history.length) {
                throw new Error('Invalid moment index');
            }
        }
    } else if (targetIndex < 0 || targetIndex >= history.length) {
        throw new Error('Invalid moment index');
    }

    // 3. Add Memory to Array
    const moment = history[targetIndex];
    const memories = Array.isArray(moment.memories) ? moment.memories : [];

    // Fetch Display Name (Nickname)
    const { data: profile } = await getAdminClient()
        .from('profiles')
        .select('display_name, name')
        .eq('id', user.id)
        .single();

    const authorDisplayName = profile?.display_name || profile?.name || user.user_metadata?.full_name || 'Owner';

    const newMemory = {
        id: randomUUID(),
        author_id: user.id,
        author_name: authorDisplayName, // Snapshot Nickname
        text: text,
        created_at: new Date().toISOString(),
        is_hidden: false
    };

    memories.push(newMemory);

    history[targetIndex] = {
        ...moment,
        memories: memories,
        // Legacy fields for backward compat (optional, or just clear them?)
        // user_note: text, // Maybe don't overwrite legacy to keep it safe?
        // note_updated_at: new Date().toISOString()
    };

    // 4. Save
    const { error: updateError } = await getAdminClient()
        .from('listing_items')
        .update({ moment_history: history })
        .eq('id', itemId);

    if (updateError) throw new Error(updateError.message);

    revalidatePath(`/listings/${itemId}`);
    revalidatePath('/collection');
    return { success: true };
}

/**
 * Edit an existing memory
 */
export async function editMomentMemory(itemId: string, momentIndex: number, memoryId: string, newText: string, momentId?: string) {
    if (newText.length > 150) throw new Error('Note must be less than 150 characters');

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: item } = await getAdminClient().from('listing_items').select('seller_id, moment_history').eq('id', itemId).single();
    if (!item) throw new Error('Item not found');

    let history = [...(item.moment_history || [])];
    let targetIndex = momentIndex;
    if (momentId) {
        const idx = history.findIndex((m: any) => m.moment_id === momentId);
        if (idx !== -1) targetIndex = idx;
    }
    if (targetIndex < 0) throw new Error('Invalid index');

    const moment = history[targetIndex];
    const memories = Array.isArray(moment.memories) ? moment.memories : [];

    const memIndex = memories.findIndex((m: any) => m.id === memoryId);
    if (memIndex === -1) throw new Error('Memory not found');

    // Permission Check: Author only
    if (memories[memIndex].author_id !== user.id) throw new Error('You can only edit your own memories');

    // Refresh Display Name (Nickname) on Edit
    const { data: profile } = await getAdminClient()
        .from('profiles')
        .select('display_name, name')
        .eq('id', user.id)
        .single();

    const authorDisplayName = profile?.display_name || profile?.name || user.user_metadata?.full_name || memories[memIndex].author_name;

    memories[memIndex] = {
        ...memories[memIndex],
        text: newText,
        author_name: authorDisplayName,
        updated_at: new Date().toISOString()
    };

    history[targetIndex] = { ...moment, memories };

    const { error } = await getAdminClient().from('listing_items').update({ moment_history: history }).eq('id', itemId);
    if (error) throw new Error(error.message);

    revalidatePath(`/listings/${itemId}`);
    revalidatePath('/collection');
    return { success: true };
}

/**
 * PHYSICALLY Delete a memory
 * Only the author can physically delete their own memory.
 */
export async function deleteMomentMemory(itemId: string, momentIndex: number, memoryId: string, momentId?: string) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: item } = await getAdminClient().from('listing_items').select('seller_id, moment_history').eq('id', itemId).single();
    if (!item) throw new Error('Item not found');

    let history = [...(item.moment_history || [])];
    let targetIndex = momentIndex;
    if (momentId) {
        const idx = history.findIndex((m: any) => m.moment_id === momentId);
        if (idx !== -1) targetIndex = idx;
    }

    const moment = history[targetIndex];
    let memories = Array.isArray(moment.memories) ? moment.memories : [];
    const memIndex = memories.findIndex((m: any) => m.id === memoryId);
    if (memIndex === -1) throw new Error('Memory not found');

    const memory = memories[memIndex];

    // Author Check: ONLY the author can physically delete.
    if (memory.author_id !== user.id) {
        throw new Error('Only the original author can physically delete this memory. Owners should use Hide instead.');
    }

    // Physical Delete
    memories.splice(memIndex, 1);
    history[targetIndex] = { ...moment, memories };

    const { error } = await getAdminClient().from('listing_items').update({ moment_history: history }).eq('id', itemId);
    if (error) throw new Error(error.message);

    revalidatePath(`/listings/${itemId}`);
    revalidatePath('/collection');
    return { success: true };
}

/**
 * LOGICALLY Hide/Unhide a memory
 * Both the current card owner AND the original author can toggle visibility.
 */
export async function toggleHideMomentMemory(itemId: string, momentIndex: number, memoryId: string, momentId?: string) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: item } = await getAdminClient().from('listing_items').select('seller_id, moment_history').eq('id', itemId).single();
    if (!item) throw new Error('Item not found');

    let history = [...(item.moment_history || [])];
    let targetIndex = momentIndex;
    if (momentId) {
        const idx = history.findIndex((m: any) => m.moment_id === momentId);
        if (idx !== -1) targetIndex = idx;
    }

    const moment = history[targetIndex];
    let memories = Array.isArray(moment.memories) ? moment.memories : [];
    const memIndex = memories.findIndex((m: any) => m.id === memoryId);
    if (memIndex === -1) throw new Error('Memory not found');

    // Permission Check: Owner or Author
    if (item.seller_id !== user.id && memories[memIndex].author_id !== user.id) {
        throw new Error('Only the current owner or the original author can change visibility');
    }

    // Toggle
    memories[memIndex].is_hidden = !memories[memIndex].is_hidden;
    history[targetIndex] = { ...moment, memories };

    const { error } = await getAdminClient().from('listing_items').update({ moment_history: history }).eq('id', itemId);
    if (error) throw new Error(error.message);

    revalidatePath(`/listings/${itemId}`);
    revalidatePath('/collection');
    return { success: true };
}

/**
 * Hide/Unhide an entire moment in the history
 * Only the current card owner can hide/unhide whole moments.
 */
export async function toggleHideMoment(itemId: string, momentIndex: number, isHidden: boolean, momentId?: string) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: item, error: fetchError } = await getAdminClient()
        .from('listing_items')
        .select('seller_id, moment_history')
        .eq('id', itemId)
        .single();

    if (fetchError || !item) throw new Error('Item not found');
    if (item.seller_id !== user.id) throw new Error('Only the owner can manage memories');

    let history = [...(item.moment_history || [])];
    let targetIndex = momentIndex;

    if (momentId) {
        const foundIndex = history.findIndex((m: any) => m.moment_id === momentId);
        if (foundIndex !== -1) targetIndex = foundIndex;
    }

    if (targetIndex < 0 || targetIndex >= history.length) throw new Error('Invalid index');

    // Logical delete (Hide)
    history[targetIndex] = {
        ...history[targetIndex],
        is_hidden: isHidden
    };

    const { error: updateError } = await getAdminClient()
        .from('listing_items')
        .update({ moment_history: history })
        .eq('id', itemId);

    if (updateError) throw new Error(updateError.message);

    revalidatePath(`/listings/${itemId}`);
    revalidatePath('/collection');
    return { success: true };
}

/**
 * Find the item that was cloned for the buyer after a successful order
 */
export async function getBuyerItemByOrder(orderId: string) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY is missing in Action environment.");
        return null;
    }

    try {
        // 1. Get order details
        const { data: order } = await getAdminClient()
            .from('orders')
            .select('listing_id, buyer_id, status, moment_snapshot, listing:listing_items!listing_id(*)')
            .eq('id', orderId)
            .single();

        if (!order) return null;

        // Security check
        if (order.buyer_id !== user.id) return null;

        const listing = Array.isArray(order.listing) ? order.listing[0] : order.listing;
        if (!listing) return null;

        return {
            id: listing.id,
            history: listing.moment_history || []
        };
    } catch (criticalError: any) {
        console.error("[getBuyerItemByOrder] Critical Crash:", criticalError);
        return null;
    }
}
