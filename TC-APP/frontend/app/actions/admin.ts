'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Admin Client (Bypass RLS)
const getAdminClient = () => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Server Config Error: SUPABASE_SERVICE_ROLE_KEY is missing.');
    }
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
};

export async function createLiveMoment(formData: FormData) {
    const playerName = formData.get('playerName') as string;
    const title = formData.get('title') as string;
    const type = formData.get('type') as string;
    const intensity = parseInt(formData.get('intensity') as string);
    const description = formData.get('description') as string;
    const imageUrl = formData.get('imageUrl') as string;

    // Structured Match Data
    const teamVisitor = formData.get('teamVisitor') as string;
    const scoreVisitor = formData.get('scoreVisitor') as string;
    const teamHome = formData.get('teamHome') as string;
    const scoreHome = formData.get('scoreHome') as string;
    const progress = formData.get('progress') as string;

    let matchResult = null;
    if (teamVisitor && teamHome) {
        matchResult = `${teamVisitor} ${scoreVisitor || '0'} - ${scoreHome || '0'} ${teamHome} (${progress || 'Pre-Game'})`;
    }

    if (!playerName || !title || !type) {
        throw new Error('Missing required fields');
    }

    const { error } = await getAdminClient()
        .from('live_moments')
        .insert({
            player_name: playerName,
            title,
            type,
            intensity,
            description,
            image_url: imageUrl,
            match_result: matchResult
        });

    if (error) throw new Error(error.message);

    revalidatePath('/admin/moments');
}

export async function approvePayout(payoutId: string) {
    // 1. Mark Payout as Paid
    const { error } = await getAdminClient()
        .from('payouts')
        .update({
            status: 'paid',
            processed_at: new Date().toISOString()
        })
        .eq('id', payoutId);

    if (error) throw new Error(error.message);

    revalidatePath('/admin/payouts');
    revalidatePath('/admin'); // KPI update
}

export async function rejectPayout(payoutId: string) {
    // Mark Payout as Rejected
    // Note: User balance is automatically restored because getAvailableBalance
    // excludes rejected payouts via .neq('status', 'rejected')
    const { error } = await getAdminClient()
        .from('payouts')
        .update({
            status: 'rejected',
            processed_at: new Date().toISOString()
        })
        .eq('id', payoutId);

    if (error) throw new Error(error.message);

    revalidatePath('/admin/payouts');
    revalidatePath('/admin'); // KPI update
}

/**
 * Finalize a Live Moment (Game Set)
 * Updates the moment result and propagates it to all stamped cards.
 */
export async function finalizeMoment(momentId: string, formData: FormData) {
    let finalScore = formData.get('finalScore') as string;

    if (!momentId || !finalScore) {
        throw new Error('Missing required fields');
    }

    // Auto-update inning to "9回裏" if "Game Set" button is pressed (User Requirement)
    // Replaces pattern like "(Top 1st)" or "(1回表)" with "(9回裏)"
    const inningPattern = /\((?:Top|Bot)\s+\d+\w+\)|\(\d+回[表裏]\)/gi;
    if (inningPattern.test(finalScore)) {
        finalScore = finalScore.replace(inningPattern, '(9回裏)');
    }

    console.log(`Finalizing Moment ${momentId} with score: ${finalScore}`);

    // 1. Update Live Moment Record
    const { error: updateError } = await getAdminClient()
        .from('live_moments')
        .update({
            match_result: finalScore,
            is_finalized: true
        })
        .eq('id', momentId);

    if (updateError) throw new Error(`Failed to update moment: ${updateError.message}`);

    // 2. Propagate to Items (Sync Logic)
    // Find items that have this moment in their history
    // Since we use JSONB array, we can filter roughly by string match or JSON containment if supported.
    // For MVP, simplistic fetch & filter is safer if volume is low.
    // Or use pgsql contains operator '@>'. 
    // BUT supabase-js syntax for json array contains element with specific field value is tricky.
    // We'll fetch items where moment_history is not empty/null for efficiency, then filter in memory (MVP).
    // Or better: .not('moment_history', 'is', null)

    // Efficient Query Attempt:
    // We want rows where moment_history @> [{ "moment_id": "..." }]
    // Supabase TS: .contains('moment_history', JSON.stringify([{ moment_id: momentId }]))

    const { data: items, error: fetchError } = await getAdminClient()
        .from('listing_items')
        .select('id, moment_history')
        .contains('moment_history', JSON.stringify([{ moment_id: momentId }]));

    if (fetchError) {
        console.error('Error fetching affected items:', fetchError);
        // We don't throw, we effectively partial success (Moment updated, sync failed)
        // But better to warn.
    }

    if (items && items.length > 0) {
        console.log(`Syncing ${items.length} items for Moment ${momentId}...`);

        const updates = items.map(async (item) => {
            const history = item.moment_history as any[];
            const updatedHistory = history.map(h => {
                if (h.moment_id === momentId) {
                    return { ...h, match_result: finalScore, status: 'finalized' };
                }
                return h;
            });

            return getAdminClient()
                .from('listing_items')
                .update({ moment_history: updatedHistory })
                .eq('id', item.id);
        });

        await Promise.all(updates);
        console.log('Sync complete.');
    }

    revalidatePath('/admin/moments');
}

export async function updateLiveMoment(momentId: string, formData: FormData) {
    const playerName = formData.get('playerName') as string;
    const title = formData.get('title') as string;
    const type = formData.get('type') as string;
    const intensity = parseInt(formData.get('intensity') as string);
    const description = formData.get('description') as string;
    const imageUrl = formData.get('imageUrl') as string;

    // Structured Match Data
    const teamVisitor = formData.get('teamVisitor') as string;
    const scoreVisitor = formData.get('scoreVisitor') as string;
    const teamHome = formData.get('teamHome') as string;
    const scoreHome = formData.get('scoreHome') as string;
    const progress = formData.get('progress') as string;

    let matchResult = null;
    if (teamVisitor && teamHome) {
        matchResult = `${teamVisitor} ${scoreVisitor || '0'} - ${scoreHome || '0'} ${teamHome} (${progress || 'Pre-Game'})`;
    }

    if (!momentId || !playerName || !title || !type) {
        throw new Error('Missing required fields');
    }

    const admin = getAdminClient();

    // Checking usage in listing_items
    const { count } = await admin
        .from('listing_items')
        .select('id', { count: 'exact', head: true })
        .contains('moment_history', JSON.stringify([{ moment_id: momentId }]));

    if (count && count > 0) {
        throw new Error("このモーメントはすでにカードに記録（配布）されているため、変更できません。");
    }

    const { error } = await admin
        .from('live_moments')
        .update({
            player_name: playerName,
            title,
            type,
            intensity,
            description,
            image_url: imageUrl,
            match_result: matchResult
        })
        .eq('id', momentId);

    if (error) throw new Error(error.message);

    revalidatePath('/admin/moments');
}

export async function deleteLiveMoment(momentId: string) {
    if (!momentId) {
        throw new Error('Missing momentId');
    }

    const admin = getAdminClient();

    // Checking usage in listing_items
    const { count } = await admin
        .from('listing_items')
        .select('id', { count: 'exact', head: true })
        .contains('moment_history', JSON.stringify([{ moment_id: momentId }]));

    if (count && count > 0) {
        throw new Error("このモーメントはすでにカードに記録（配布）されているため、削除できません。");
    }

    const { error } = await admin
        .from('live_moments')
        .delete()
        .eq('id', momentId);

    if (error) throw new Error(error.message);

    revalidatePath('/admin/moments');
}
