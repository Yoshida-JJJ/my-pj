import { createClient } from '@supabase/supabase-js';
import PayoutRow from './PayoutRow';
import PayoutHistoryRow from './PayoutHistoryRow';

// Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AdminPayoutsPage() {
    // 1. Fetch pending payouts
    const { data: payoutsRaw, error } = await supabaseAdmin
        .from('payouts')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Payout Fetch Error:", error);
    }

    // 2. Fetch processed payouts (paid + rejected) for history
    const { data: historyRaw } = await supabaseAdmin
        .from('payouts')
        .select('*')
        .in('status', ['paid', 'rejected'])
        .order('processed_at', { ascending: false })
        .limit(50);

    // 3. KPI Data: Monthly Total
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthlyPaid } = await supabaseAdmin
        .from('payouts')
        .select('payout_amount')
        .eq('status', 'paid')
        .gte('processed_at', startOfMonth.toISOString());

    const monthlyTotal = monthlyPaid?.reduce((sum: number, p: any) => sum + (p.payout_amount || 0), 0) || 0;

    // 4. KPI Data: All-time Total
    const { data: allPaid } = await supabaseAdmin
        .from('payouts')
        .select('payout_amount')
        .eq('status', 'paid');

    const allTimeTotal = allPaid?.reduce((sum: number, p: any) => sum + (p.payout_amount || 0), 0) || 0;

    // 5. Manual Join to avoid relation constraints with auth.users
    const payouts = payoutsRaw || [];
    const history = historyRaw || [];
    const allPayouts = [...payouts, ...history];
    const userIds = Array.from(new Set(allPayouts.map((p: any) => p.user_id)));

    let profilesMap: Record<string, any> = {};
    let banksMap: Record<string, any> = {};

    if (userIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, email, name')
            .in('id', userIds);

        const { data: banks } = await supabaseAdmin
            .from('bank_accounts')
            .select('*')
            .in('user_id', userIds);

        profiles?.forEach((p: any) => profilesMap[p.id] = p);
        banks?.forEach((b: any) => banksMap[b.user_id] = b);
    }

    const pendingCount = payouts.length;

    return (
        <div className="p-8">
            <h2 className="text-2xl font-bold mb-6">Payout Manager</h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Pending Count */}
                <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30">
                    <p className="text-red-400 text-xs uppercase tracking-wider mb-1">Pending</p>
                    <p className="text-3xl font-bold text-red-400">{pendingCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Awaiting processing</p>
                </div>

                {/* Monthly Total */}
                <div className="p-6 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/30">
                    <p className="text-[#FFD700] text-xs uppercase tracking-wider mb-1">This Month</p>
                    <p className="text-3xl font-bold text-[#FFD700]">¥{monthlyTotal.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Total paid out</p>
                </div>

                {/* All-time Total */}
                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">All Time</p>
                    <p className="text-3xl font-bold text-white">¥{allTimeTotal.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Cumulative payouts</p>
                </div>
            </div>

            {/* Pending Payouts Table */}
            <div className="mb-10">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Pending Payouts
                </h3>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-gray-400 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Bank Details</th>
                                <th className="px-6 py-4 text-right">Amount (Yen)</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 bg-black/20">
                            {payouts.map((p: any) => {
                                const bank = banksMap[p.user_id];
                                const profile = profilesMap[p.user_id];
                                return (
                                    <PayoutRow key={p.id} payout={p} profile={profile} bank={bank} />
                                );
                            })}
                            {payouts?.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        No pending payouts.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payout History Table */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4">Payout History</h3>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-gray-400 uppercase font-medium text-xs">
                            <tr>
                                <th className="px-4 py-3">Processed</th>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3 text-right">Transfer</th>
                                <th className="px-4 py-3 text-right">Fee</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 bg-black/20">
                            {history.map((p: any) => {
                                const bank = banksMap[p.user_id];
                                const profile = profilesMap[p.user_id];
                                return (
                                    <PayoutHistoryRow key={p.id} payout={p} profile={profile} bank={bank} />
                                );
                            })}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        No payout history yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
