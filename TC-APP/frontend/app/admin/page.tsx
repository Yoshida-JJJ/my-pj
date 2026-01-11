import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createLiveMoment, finalizeMoment } from '@/app/actions/admin';

// Need admin client for global stats if RLS restricts (e.g. counting total users)
const getAdminClient = () => {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
};

export default async function AdminDashboard() {
    const supabaseAdmin = getAdminClient();

    // 1. Total Users
    const { count: userCount } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    // 2. Active Listings
    const { count: listingCount } = await supabaseAdmin
        .from('listing_items')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active');

    // 3. Pending Payouts
    const { count: payoutCount } = await supabaseAdmin
        .from('payouts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    // 4. Recent Moments (History)
    const { data: moments } = await supabaseAdmin
        .from('live_moments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    return (
        <div className="p-4 md:p-8 space-y-10">
            <h2 className="text-2xl font-bold mb-6">Admin Control Panel</h2>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Users</h3>
                    <p className="text-4xl font-mono font-bold text-white mt-2">{userCount ?? '-'}</p>
                </div>
                <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Active Listings</h3>
                    <p className="text-4xl font-mono font-bold text-[#FFD700] mt-2">{listingCount ?? '-'}</p>
                </div>
                <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Pending Payouts</h3>
                    <p className="text-4xl font-mono font-bold text-red-500 mt-2">{payoutCount ?? '-'}</p>
                </div>
            </div>

            {/* Event Registration Section (Live Moments) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold mb-6 text-[#FFD700] flex items-center gap-2">
                        <span>Live Moment / Event Registration</span>
                    </h3>

                    <form action={createLiveMoment} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-tighter">Player Name</label>
                                <input name="playerName" required className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white focus:border-[#FFD700] outline-none" placeholder="e.g. Shohei Ohtani" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-tighter">Event Title</label>
                                <input name="title" required className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white focus:border-[#FFD700] outline-none" placeholder="e.g. 50-50 Achievement" />
                            </div>
                        </div>

                        <div className="bg-black/30 p-3 rounded border border-white/10 space-y-3">
                            <label className="block text-[10px] text-gray-400 mb-1 uppercase">Match Status / Live Score</label>
                            <div className="flex gap-2">
                                <select name="teamVisitor" required className="flex-1 bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-xs">
                                    <option value="">Visitor Team</option>
                                    <option value="LAD">LAD (Dodgers)</option>
                                    <option value="NYY">NYY (Yankees)</option>
                                    <option value="SD">SD (Padres)</option>
                                    <option value="JPN">Samurai Japan</option>
                                </select>
                                <input name="scoreVisitor" type="number" min="0" placeholder="0" className="w-12 bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-center" />
                                <span className="text-gray-500">vs</span>
                                <input name="scoreHome" type="number" min="0" placeholder="0" className="w-12 bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-center" />
                                <select name="teamHome" required className="flex-1 bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-xs">
                                    <option value="">Home Team</option>
                                    <option value="LAD">LAD (Dodgers)</option>
                                    <option value="NYY">NYY (Yankees)</option>
                                    <option value="SD">SD (Padres)</option>
                                    <option value="JPN">Samurai Japan</option>
                                </select>
                            </div>
                            <select name="progress" className="w-full bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-xs">
                                <option value="Top 1st">Top 1st</option>
                                <option value="Final">Final (試合終了)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Impact Level (1-5)</label>
                            <input type="range" name="intensity" min="1" max="5" defaultValue="3" className="w-full accent-[#FFD700]" />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Details</label>
                            <textarea name="description" rows={3} className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white focus:border-[#FFD700] outline-none text-sm" placeholder="Additional context..." />
                        </div>

                        <button type="submit" className="w-full bg-gradient-to-r from-[#FFD700] to-[#F0B000] text-black font-black py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#FFD700]/10">
                            BROADCAST EVENT
                        </button>
                    </form>
                </div>

                {/* History Quick-View */}
                <div>
                    <h3 className="text-xl font-bold mb-6 text-gray-300">Recent Events</h3>
                    <div className="space-y-3">
                        {moments?.map((m: any) => (
                            <div key={m.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-[#FFD700]">{m.player_name}</div>
                                    <div className="text-sm text-white">{m.title}</div>
                                    <div className="text-[10px] text-gray-500 mt-1">{new Date(m.created_at).toLocaleString()}</div>
                                </div>
                                <div className="text-right">
                                    <div className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold">LVL {m.intensity}</div>
                                    {m.is_finalized && <span className="text-green-400 text-[10px] font-bold mt-1 block">✓ FINAL</span>}
                                </div>
                            </div>
                        ))}
                        <Link href="/admin/moments" className="block text-center py-2 text-xs text-gray-500 hover:text-white transition-colors">
                            View all event history →
                        </Link>
                    </div>

                    <div className="mt-8 p-6 bg-red-500/5 border border-red-500/10 rounded-2xl">
                        <h4 className="text-red-500 font-bold mb-2">Payout Queue</h4>
                        <p className="text-sm text-gray-400">There are currently <span className="text-white font-bold">{payoutCount ?? 0}</span> payout requests pending review.</p>
                        <Link href="/admin/payouts" className="inline-block mt-4 text-xs font-bold bg-red-500/10 text-red-500 px-4 py-2 rounded-full border border-red-500/20 hover:bg-red-500/20">
                            Process Payouts →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
