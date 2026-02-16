'use client';

import { useState } from 'react';

interface PayoutHistoryRowProps {
    payout: any;
    profile: any;
    bank: any;
}

export default function PayoutHistoryRow({ payout, profile, bank }: PayoutHistoryRowProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const statusConfig = {
        paid: { label: 'Paid', bgClass: 'bg-green-500/10', borderClass: 'border-green-500/30', textClass: 'text-green-400' },
        rejected: { label: 'Rejected', bgClass: 'bg-red-500/10', borderClass: 'border-red-500/30', textClass: 'text-red-400' },
    };

    const status = statusConfig[payout.status as keyof typeof statusConfig] || statusConfig.paid;

    return (
        <>
            <tr className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setIsModalOpen(true)}>
                <td className="px-4 py-3 text-gray-400 text-sm">
                    {payout.processed_at ? new Date(payout.processed_at).toLocaleString('ja-JP') : '-'}
                </td>
                <td className="px-4 py-3">
                    <div className="font-medium text-white">{profile?.name || 'Unknown'}</div>
                    <div className="text-gray-500 text-xs">{profile?.email}</div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-white">
                    ¥{(payout.payout_amount || payout.amount).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-400 text-sm">
                    ¥{(payout.fee || 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-300">
                    ¥{payout.amount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${status.bgClass} ${status.borderClass} ${status.textClass}`}>
                        {status.label}
                    </span>
                </td>
            </tr>

            {/* Detail Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-[#111] border border-white/20 rounded-xl p-8 max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                            <h3 className="text-xl font-bold text-[#FFD700]">Payout Details</h3>
                            <span className={`px-3 py-1 rounded text-sm font-bold border ${status.bgClass} ${status.borderClass} ${status.textClass}`}>
                                {status.label}
                            </span>
                        </div>

                        <div className="space-y-6">
                            {/* Amount Breakdown */}
                            <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Transfer Amount</span>
                                    <span className="text-2xl font-mono font-bold text-white">¥{(payout.payout_amount || payout.amount).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Fee</span>
                                    <span className="font-mono text-red-400">¥{(payout.fee || 0).toLocaleString()}</span>
                                </div>
                                <div className="border-t border-white/10 pt-2 flex justify-between">
                                    <span className="text-gray-400">Total Deduction</span>
                                    <span className="font-mono text-[#FFD700]">¥{payout.amount.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Bank Details */}
                            <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Bank Name</label>
                                        <div className="text-white font-bold">{bank?.bank_name || '-'}</div>
                                        {bank?.bank_code && <div className="text-xs text-gray-400 font-mono">{bank.bank_code}</div>}
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Branch Name</label>
                                        <div className="text-white font-bold">{bank?.branch_name || '-'}</div>
                                        {bank?.branch_code && <div className="text-xs text-gray-400 font-mono">{bank.branch_code}</div>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Account Type</label>
                                        <div className="text-white capitalize">{bank?.account_type === 'current' ? '当座' : '普通'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Account Number</label>
                                        <div className="text-xl font-mono text-white tracking-widest">{bank?.account_number || '-'}</div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Account Holder (Kana)</label>
                                    <div className="text-xl text-[#FFD700] font-bold tracking-wider">{bank?.account_holder_name || '-'}</div>
                                </div>
                            </div>

                            {/* User Info */}
                            <div>
                                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">User Info</label>
                                <div className="text-sm text-gray-300">
                                    {profile?.name} <span className="text-gray-500">({profile?.email})</span>
                                </div>
                            </div>

                            {/* Timestamps */}
                            <div className="text-xs text-gray-500 space-y-1">
                                <div>申請日: {new Date(payout.created_at).toLocaleString('ja-JP')}</div>
                                {payout.processed_at && (
                                    <div>処理日: {new Date(payout.processed_at).toLocaleString('ja-JP')}</div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2 rounded text-sm font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
