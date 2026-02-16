'use client';

import { useState } from 'react';
import { approvePayout, rejectPayout } from '@/app/actions/admin';

interface PayoutRowProps {
    payout: any;
    profile: any;
    bank: any;
}

export default function PayoutRow({ payout, profile, bank }: PayoutRowProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleApprove = async () => {
        if (!confirm('Are you sure you want to mark this as PAID?')) return;
        setIsProcessing(true);
        try {
            await approvePayout(payout.id);
            // Server action revalidates path, so UI will update (row disappears)
        } catch (e) {
            alert('Error: ' + e);
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!confirm('Are you sure you want to REJECT this payout?\n\nThe amount will be returned to the user\'s balance.')) return;
        setIsProcessing(true);
        try {
            await rejectPayout(payout.id);
        } catch (e) {
            alert('Error: ' + e);
            setIsProcessing(false);
        }
    };

    return (
        <>
            <tr className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => setIsModalOpen(true)}>
                <td className="px-6 py-4">
                    <div className="font-bold text-white group-hover:text-[#FFD700] transition-colors">{profile?.name || 'Unknown'}</div>
                    <div className="text-gray-500 text-xs">{profile?.email}</div>
                    <div className="text-gray-500 text-xs font-mono mt-1">{payout.user_id}</div>
                </td>
                <td className="px-6 py-4 text-gray-300">
                    {bank ? (
                        <>
                            <div>{bank.bank_name}</div>
                            <div className="text-xs text-gray-500">{bank.account_holder_name}</div>
                        </>
                    ) : (
                        <span className="text-red-500">No Bank Info</span>
                    )}
                </td>
                <td className="px-6 py-4 text-right font-mono text-lg">
                    ¥{payout.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    {bank ? (
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={handleApprove}
                                disabled={isProcessing}
                                className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white px-3 py-2 rounded text-xs font-bold uppercase tracking-wide transition-colors"
                            >
                                {isProcessing ? '...' : 'Paid'}
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isProcessing}
                                className="bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white px-3 py-2 rounded text-xs font-bold uppercase tracking-wide transition-colors"
                            >
                                Reject
                            </button>
                        </div>
                    ) : (
                        <span className="text-red-500 font-bold text-xs uppercase border border-red-500 px-2 py-1 rounded">
                            Bank Info Missing
                        </span>
                    )}
                </td>
            </tr>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-[#111] border border-white/20 rounded-xl p-8 max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-[#FFD700] mb-6 border-b border-white/10 pb-4">Payout Details</h3>

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

                            <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Bank Name</label>
                                        <div className="text-lg text-white font-bold">{bank?.bank_name}</div>
                                        {bank?.bank_code && <div className="text-xs text-gray-400 font-mono">{bank.bank_code}</div>}
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Branch Name</label>
                                        <div className="text-lg text-white font-bold">{bank?.branch_name}</div>
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
                                        <div className="text-xl font-mono text-white tracking-widest">{bank?.account_number}</div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Account Holder (Kana)</label>
                                    <div className="text-xl text-[#FFD700] font-bold tracking-wider">{bank?.account_holder_name}</div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">User Info</label>
                                <div className="text-sm text-gray-300">
                                    {profile?.name} <span className="text-gray-500">({profile?.email})</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end space-x-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 rounded text-sm font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    handleReject();
                                }}
                                disabled={isProcessing}
                                className="bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm font-bold transition-all"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    handleApprove();
                                }}
                                disabled={isProcessing}
                                className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white px-6 py-2 rounded text-sm font-bold shadow-lg transition-all"
                            >
                                Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
