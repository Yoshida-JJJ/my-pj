
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from frontend/.env.local because that's where the new secret is (and likely other configs)
// Load env from .env.local in frontend root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Searching for Sakamoto moment...');

    const { data: moments, error } = await supabase
        .from('live_moments')
        .select('*')
        .ilike('player_name', '%坂本%')
        .ilike('title', '%2000%');

    if (error) {
        console.error('Error fetching moments:', error);
        return;
    }

    if (!moments || moments.length === 0) {
        console.log('No matching moment found.');
        return;
    }

    console.log(`Found ${moments.length} moment(s).`);

    for (const m of moments) {
        console.log(`Updating Moment: ${m.title} (${m.id})`);
        console.log(`Current Result: ${m.match_result}`);

        // Regex to replace content inside parentheses with '9回裏'
        // Or simply replace "Top 1st" if present.
        // User wants "9回裏".
        let newResult = m.match_result;

        // Strategy: Replace the text inside the last parentheses
        if (newResult.includes('(') && newResult.includes(')')) {
            newResult = newResult.replace(/\([^)]+\)$/, '(9回裏)');
        } else {
            // Append if not present?
            newResult = `${newResult} (9回裏)`;
        }

        console.log(`New Result: ${newResult}`);

        // Update live_moments
        const { error: updateError } = await supabase
            .from('live_moments')
            .update({ match_result: newResult })
            .eq('id', m.id);

        if (updateError) {
            console.error('Failed to update live_moments:', updateError);
        } else {
            console.log('✅ live_moments updated.');
        }

        // Also update history in listing_items (Sync)
        // Similar logic to finalizeMoment
        const { data: items, error: fetchError } = await supabase
            .from('listing_items')
            .select('id, moment_history')
            .contains('moment_history', JSON.stringify([{ moment_id: m.id }]));

        if (items && items.length > 0) {
            console.log(`Syncing ${items.length} cards...`);
            for (const item of items) {
                const history = item.moment_history as any[];
                const updatedHistory = history.map(h => {
                    if (h.moment_id === m.id) {
                        return { ...h, match_result: newResult };
                    }
                    return h;
                });

                await supabase
                    .from('listing_items')
                    .update({ moment_history: updatedHistory })
                    .eq('id', item.id);
            }
            console.log('✅ Cards synced.');
        }
    }
}

main();
