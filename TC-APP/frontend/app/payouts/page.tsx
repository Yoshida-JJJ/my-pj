'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../utils/supabase/client';
import Footer from '../../components/Footer';
import {
    getAvailableBalance,
    registerBankAccount,
    requestPayout,
    getPayoutHistory,
    getBankAccount,
    updateProfileKana,
    getProfileKana,
    getWithdrawalFeeTiers
} from '../actions/payout';
import { BankAccount, Payout } from '../../types';

import { useZengin, Bank, Branch } from '../../hooks/useZengin';

export default function PayoutPage() {
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    // Data State
    const [balanceData, setBalanceData] = useState({ available: 0, totalEarnings: 0, totalFees: 0, withdrawn: 0, orderCount: 0 });
    const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
    const [payoutHistory, setPayoutHistory] = useState<Payout[]>([]);
    const [profileKana, setProfileKana] = useState<string | null>(null);

    const [feeTiers, setFeeTiers] = useState<{ upTo: number; fee: number; label: string }[]>([]);

    // Form State
    const [payoutAmount, setPayoutAmount] = useState<number>(0);
    const [settingBank, setSettingBank] = useState(false); // Modal toggle

    // Zengin Hook
    const { banks, branches, fetchBranches, loadingBanks, loadingBranches } = useZengin();

    // Bank Selection State
    const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [bankSearch, setBankSearch] = useState('');
    const [branchSearch, setBranchSearch] = useState('');
    const [showBankList, setShowBankList] = useState(false);
    const [showBranchList, setShowBranchList] = useState(false);

    // Bank Form
    const [bankForm, setBankForm] = useState({
        bankName: '',
        bankCode: '',
        branchName: '',
        branchCode: '',
        accountType: 'ordinary' as 'ordinary' | 'current',
        accountNumber: '',
        accountHolderName: ''
    });

    const [fieldErrors, setFieldErrors] = useState({
        bankName: false,
        branchName: false,
        accountNumber: false
    });

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                await refreshData(user.id);
            }
            setLoading(false);
        };
        init();
    }, []);

    // Auto-heal legacy data: If we have bank name but no code, try to find it in loaded banks
    useEffect(() => {
        if (bankAccount && !bankAccount.bank_code && banks.length > 0 && !selectedBank) {
            const match = banks.find(b => b.name === bankAccount.bank_name);
            if (match) {
                console.log("Auto-healing bank code for:", match.name);
                // Update local form state (this doesn't save to DB until they click Register)
                setBankForm(prev => ({ ...prev, bankCode: match.code }));
                setSelectedBank(match);
                fetchBranches(match.code);
            }
        }
    }, [bankAccount, banks, selectedBank]);

    const refreshData = async (uid: string) => {
        try {
            const [bal, bank, hist, kana, tiers] = await Promise.all([
                getAvailableBalance(uid),
                getBankAccount(uid),
                getPayoutHistory(uid),
                getProfileKana(uid),
                getWithdrawalFeeTiers()
            ]);
            setBalanceData(bal);
            setBankAccount(bank);
            setPayoutHistory(hist || []);
            setProfileKana(kana);

            setFeeTiers(tiers);

            // Pre-fill bank form if exists
            if (bank) {
                setBankForm({
                    bankName: bank.bank_name,
                    bankCode: bank.bank_code || '',
                    branchName: bank.branch_name,
                    branchCode: bank.branch_code || '',
                    accountType: bank.account_type as 'ordinary' | 'current',
                    accountNumber: bank.account_number,
                    accountHolderName: bank.account_holder_name
                });

                // Initialize input search fields
                setBankSearch(bank.bank_name);
                setBranchSearch(bank.branch_name);

                // Set Selected Bank if code exists (for branch enabling)
                if (bank.bank_code) {
                    setSelectedBank({ code: bank.bank_code, name: bank.bank_name, kana: '', hira: '', roma: '' } as Bank);
                    // Fetch branches for this code so user can edit branch immediately if needed
                    fetchBranches(bank.bank_code);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRegisterBank = async () => {
        if (!userId || isSubmitting) return;

        // Reset errors
        setFieldErrors({ bankName: false, branchName: false, accountNumber: false });
        setErrorMsg(null);

        const newErrors = {
            bankName: !bankForm.bankName.trim(),
            branchName: !bankForm.branchName.trim(),
            accountNumber: !bankForm.accountNumber.trim() || bankForm.accountNumber.length !== 7
        };

        if (newErrors.bankName || newErrors.branchName || newErrors.accountNumber) {
            setFieldErrors(newErrors);
            if (newErrors.accountNumber && bankForm.accountNumber.length !== 7 && bankForm.accountNumber.trim()) {
                setErrorMsg("Account Number must be exactly 7 digits.");
            } else {
                setErrorMsg("Please fill in all highlighted fields.");
            }
            return;
        }

        setIsSubmitting(true);
        try {
            setErrorMsg(null);
            // 1. Register Bank
            await registerBankAccount(userId, bankForm);

            // 2. Close Modal Immediately for responsiveness
            setSettingBank(false);
            setSuccessMsg("Bank account registered successfully.");

            // 3. Refresh Data in Background
            await refreshData(userId);

        } catch (err: any) {
            setErrorMsg(err.message);
            // If failed, keep modal open to show error
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestPayout = async () => {
        if (!userId) return;

        if (payoutAmount < 1000) {
            setErrorMsg("Minimum payout amount is ¥1,000.");
            return;
        }

        try {
            setErrorMsg(null);
            await requestPayout(userId, payoutAmount);
            await refreshData(userId);
            setPayoutAmount(0);
            setSuccessMsg("Payout requested successfully.");
        } catch (err: any) {
            setErrorMsg(err.message);
        }
    };

    // Filter Banks
    const filteredBanks = banks.filter(b =>
        b.name.includes(bankSearch) ||
        b.code.includes(bankSearch) ||
        b.kana.includes(bankSearch)
    );

    // Filter Branches
    const filteredBranches = branches.filter(b =>
        b.name.includes(branchSearch) ||
        b.code.includes(branchSearch) ||
        b.kana.includes(branchSearch)
    );

    const selectBank = (bank: Bank) => {
        setSelectedBank(bank);
        setBankForm(prev => ({ ...prev, bankName: bank.name, bankCode: bank.code, branchName: '', branchCode: '' }));
        setFieldErrors(prev => ({ ...prev, bankName: false }));
        setBankSearch(bank.name);
        setShowBankList(false);
        fetchBranches(bank.code);
        setBranchSearch('');
        setSelectedBranch(null);
    };

    const selectBranch = (branch: Branch) => {
        setSelectedBranch(branch);
        setBankForm(prev => ({ ...prev, branchName: branch.name, branchCode: branch.code }));
        setFieldErrors(prev => ({ ...prev, branchName: false }));
        setBranchSearch(branch.name);
        setShowBranchList(false);
    };

    // Calculate withdrawal fee based on tiered structure
    const calcFee = (amount: number): number => {
        for (const tier of feeTiers) {
            if (tier.upTo === 0 || amount <= tier.upTo) {
                return tier.fee;
            }
        }
        return feeTiers.length > 0 ? feeTiers[feeTiers.length - 1].fee : 0;
    };

    if (loading) return <div className="min-h-screen bg-brand-dark flex items-center justify-center text-brand-gold">Loading...</div>;
    if (!userId) return <div className="min-h-screen bg-brand-dark p-10 text-white">Please Log In</div>;

    const displayHolderName = profileKana ? profileKana.replace(/[\s\u3000]+/g, '') : '';

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col pt-32 pb-12">
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex-1">

                <h1 className="text-3xl font-heading font-bold text-white mb-8 border-b border-white/10 pb-4">
                    売上管理
                </h1>

                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg">
                        {errorMsg}
                    </div>
                )}
                {successMsg && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 text-green-500 rounded-lg">
                        {successMsg}
                    </div>
                )}

                {/* --- 1. Dashboard: Balance --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="p-6 rounded-2xl bg-brand-dark-light/50 border border-brand-gold/20 shadow-[0_0_30px_rgba(234,179,8,0.05)]">
                        <p className="text-brand-platinum/60 text-sm font-medium uppercase tracking-wider mb-2">振込可能残高</p>
                        <p className="text-4xl text-brand-gold font-heading font-bold">
                            ¥{balanceData.available.toLocaleString()}
                        </p>
                    </div>
                    <div className="p-6 rounded-2xl bg-brand-dark-light/30 border border-white/5">
                        <p className="text-brand-platinum/60 text-sm font-medium uppercase tracking-wider mb-2">累計収益</p>
                        <p className="text-2xl text-white font-heading font-bold">
                            ¥{balanceData.totalEarnings.toLocaleString()}
                        </p>
                        <p className="text-xs text-brand-platinum/50 mt-1">
                            {balanceData.orderCount}件の取引 / 手数料 ¥{balanceData.totalFees.toLocaleString()}
                        </p>
                    </div>
                    <div className="p-6 rounded-2xl bg-brand-dark-light/30 border border-white/5">
                        <p className="text-brand-platinum/60 text-sm font-medium uppercase tracking-wider mb-2">出金済み/申請中</p>
                        <p className="text-2xl text-white font-heading font-bold">
                            ¥{balanceData.withdrawn.toLocaleString()}
                        </p>
                    </div>
                </div>




                {/* --- 2. Bank Settings & Profile Name --- */}
                <div className="mb-10">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">口座登録</h2>
                        {!bankAccount && (
                            <button
                                onClick={() => setSettingBank(true)}
                                className="px-4 py-2 bg-brand-blue/10 text-brand-blue border border-brand-blue/30 rounded-lg hover:bg-brand-blue/20 transition-all font-bold text-sm"
                            >
                                口座を登録
                            </button>
                        )}
                        {bankAccount && (
                            <button
                                onClick={() => setSettingBank(true)}
                                className="px-4 py-2 bg-brand-platinum/10 text-brand-platinum border border-brand-platinum/20 rounded-lg hover:bg-brand-platinum/20 transition-all font-bold text-sm"
                            >
                                口座を編集
                            </button>
                        )}
                    </div>

                    <div className="p-6 rounded-2xl bg-brand-dark-light/30 border border-white/10">
                        {bankAccount ? (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-brand-platinum/50 block">金融機関</span> <span className="text-white">{bankAccount.bank_name}</span></div>
                                <div><span className="text-brand-platinum/50 block">支店</span> <span className="text-white">{bankAccount.branch_name}</span></div>
                                <div><span className="text-brand-platinum/50 block">種別</span> <span className="text-white">{bankAccount.account_type === 'ordinary' ? '普通' : '当座'}</span></div>
                                <div><span className="text-brand-platinum/50 block">口座番号</span> <span className="text-white">****{bankAccount.account_number.slice(-4)}</span></div>
                                <div className="col-span-2 border-t border-white/5 pt-2 mt-2">
                                    <span className="text-brand-platinum/50 block">名義人</span>
                                    <span className="text-brand-gold font-mono">{bankAccount.account_holder_name}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-brand-platinum/50 italic">口座情報が登録されていません。</p>
                        )}
                    </div>
                </div>

                {/* --- 3. Withdraw Action --- */}
                <div className="mb-10 p-6 rounded-2xl bg-brand-dark-light/30 border border-white/10">
                    <h2 className="text-xl font-bold text-white mb-4">出金申請</h2>
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-brand-platinum/60 text-xs uppercase mb-2">出金希望額</label>
                            <input
                                type="number"
                                value={payoutAmount || ''}
                                onChange={(e) => setPayoutAmount(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full bg-brand-dark border border-brand-platinum/20 rounded-lg px-4 py-3 text-white focus:border-brand-gold focus:outline-none mb-2"
                                placeholder="最低 ￥1,000"
                            />

                            {/* Fee Calculation Display */}
                            <div className="bg-brand-dark p-3 rounded-lg border border-white/5 text-sm space-y-1">
                                <div className="flex justify-between text-brand-platinum/60">
                                    <span>出金希望額:</span>
                                    <span>￥{payoutAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-brand-platinum/60">
                                    <span>振込手数料:</span>
                                    <span className="text-red-400">
                                        ￥{calcFee(payoutAmount).toLocaleString()}
                                    </span>
                                </div>
                                <div className="border-t border-white/10 my-1"></div>
                                <div className="flex justify-between font-bold text-white">
                                    <span>合計減算額:</span>
                                    <span className="text-brand-gold">
                                        ￥{(payoutAmount + calcFee(payoutAmount)).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 text-[10px] text-brand-platinum/50 space-y-0.5">
                                <p className="font-bold mb-1">※ 振込手数料</p>
                                {feeTiers.map((tier, i) => (
                                    <p key={i}>{tier.label}: ¥{tier.fee.toLocaleString()}</p>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleRequestPayout}
                            disabled={
                                !bankAccount ||
                                payoutAmount < 1000 ||
                                (payoutAmount + calcFee(payoutAmount)) > balanceData.available
                            }
                            className="w-full md:w-auto bg-brand-gold text-brand-dark font-bold px-8 py-3 rounded-lg hover:bg-brand-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-[50px]"
                        >
                            出金を申請
                        </button>
                    </div>
                    {(!bankAccount) && <p className="text-red-400 text-xs mt-2">先に口座情報を登録してください。</p>}
                    {/* Error if Total > Balance */}
                    {((payoutAmount + calcFee(payoutAmount)) > balanceData.available) &&
                        <p className="text-red-400 text-xs mt-2">残高が不足しています。</p>}
                    {(payoutAmount > 0 && payoutAmount < 1000) && <p className="text-red-400 text-xs mt-2">最低出金額は￥1,000です。</p>}
                </div>

                {/* --- 4. History --- */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-4">出金履歴</h2>
                    <div className="rounded-xl overflow-hidden border border-white/10">
                        <table className="w-full text-left text-sm text-brand-platinum">
                            <thead className="bg-brand-dark-light/50 text-brand-platinum/60 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">日付</th>
                                    <th className="px-6 py-3">金額</th>
                                    <th className="px-6 py-3">ステータス</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {payoutHistory.length === 0 ? (
                                    <tr><td colSpan={3} className="px-6 py-8 text-center opacity-50">出金履歴はありません</td></tr>
                                ) : (
                                    payoutHistory.map(p => (
                                        <tr key={p.id} className="hover:bg-white/5">
                                            <td className="px-6 py-4">{new Date(p.created_at).toLocaleDateString('ja-JP')}</td>
                                            <td className="px-6 py-4 text-white font-mono">￥{p.amount.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs border ${p.status === 'paid' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                                                    p.status === 'rejected' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                                                        'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                                                    }`}>
                                                    {p.status === 'paid' ? '振込済' : p.status === 'rejected' ? '却下' : '申請中'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
            <Footer />

            {/* --- Modals --- */}
            {settingBank && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-brand-dark-light border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl h-[90vh] sm:h-auto overflow-y-auto">
                        <h3 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">Bank Account</h3>

                        {!profileKana ? (
                            /* BLOCKER VIEW */
                            <div className="py-8 flex flex-col items-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                </div>
                                <h4 className="text-lg font-bold text-white">Profile Name Required</h4>
                                <p className="text-brand-platinum/80 text-sm">
                                    To register a bank account, you must first set your <strong>Real Name (Katakana)</strong> in your profile.<br />
                                    This ensures the name matches your bank account holder name.
                                </p>
                                <a href="/profile" className="mt-4 px-6 py-3 bg-brand-blue hover:bg-brand-blue-glow text-white font-bold rounded-xl w-full">
                                    Go to Profile Settings
                                </a>
                                <button onClick={() => setSettingBank(false)} className="text-brand-platinum text-sm hover:text-white mt-4">
                                    Close
                                </button>
                            </div>
                        ) : (
                            /* FORM VIEW */
                            <div className="space-y-5">
                                {/* 1. Bank Name Combobox */}
                                <div className="relative">
                                    <label className={`block text-xs mb-1 ${fieldErrors.bankName ? 'text-red-400 font-bold' : 'text-brand-platinum/60'}`}>Bank Name <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        className={`w-full bg-brand-dark border rounded-lg p-3 text-white focus:outline-none transition-colors ${fieldErrors.bankName ? 'border-red-500/50 focus:border-red-500' : 'border-brand-platinum/20 focus:border-brand-blue'}`}
                                        placeholder="Search bank name or code..."
                                        value={bankSearch}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setBankSearch(val);
                                            setShowBankList(true);
                                            setFieldErrors(prev => ({ ...prev, bankName: false }));

                                            // Live match or update text
                                            const match = banks.find(b => b.name === val || b.code === val);
                                            if (match) {
                                                setSelectedBank(match);
                                                setBankForm(prev => ({ ...prev, bankName: match.name, bankCode: match.code, branchName: '', branchCode: '' }));
                                                fetchBranches(match.code);
                                                setBranchSearch('');
                                                setSelectedBranch(null);
                                            } else {
                                                setSelectedBank(null);
                                                setBankForm(prev => ({ ...prev, bankName: val, bankCode: '' }));
                                                // If loose text, we can't fetch branches yet or ensure validity, but we save the text.
                                            }
                                        }}
                                        onFocus={() => setShowBankList(true)}
                                    />
                                    {showBankList && (
                                        <div className="absolute z-50 top-full left-0 w-full max-h-60 overflow-y-auto bg-brand-dark border border-brand-platinum/20 rounded-lg mt-1 shadow-xl">
                                            {loadingBanks ? <div className="p-3 text-xs text-brand-platinum">Loading banks...</div> :
                                                filteredBanks.length === 0 ? <div className="p-3 text-xs text-brand-platinum">No banks found.</div> :
                                                    filteredBanks.map(bank => (
                                                        <button
                                                            key={bank.code}
                                                            className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 text-sm text-white"
                                                            onClick={() => selectBank(bank)}
                                                        >
                                                            <span className="text-brand-platinum/60 mr-2 text-xs">{bank.code}</span>
                                                            {bank.name}
                                                        </button>
                                                    ))
                                            }
                                        </div>
                                    )}
                                </div>

                                {/* 2. Branch Name Combobox */}
                                <div className="relative">
                                    <label className={`block text-xs mb-1 ${fieldErrors.branchName ? 'text-red-400 font-bold' : 'text-brand-platinum/60'}`}>Branch Name <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        className={`w-full bg-brand-dark border rounded-lg p-3 text-white focus:outline-none transition-colors ${!selectedBank ? 'opacity-50 cursor-not-allowed' : ''} ${fieldErrors.branchName ? 'border-red-500/50 focus:border-red-500' : 'border-brand-platinum/20 focus:border-brand-blue'}`}
                                        placeholder="Search branch name or code..."
                                        value={branchSearch}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setBranchSearch(val);
                                            setShowBranchList(true);
                                            setFieldErrors(prev => ({ ...prev, branchName: false }));

                                            // Live match branch
                                            if (selectedBank) {
                                                // Need to search in 'branches' if available? 'branches' are loaded for selectedBank.
                                                // Since filteredBranches is derived from branches, we can search branches.
                                                const match = branches.find(b => b.name === val || b.code === val);
                                                if (match) {
                                                    setSelectedBranch(match);
                                                    setBankForm(prev => ({ ...prev, branchName: match.name, branchCode: match.code }));
                                                } else {
                                                    setSelectedBranch(null);
                                                    setBankForm(prev => ({ ...prev, branchName: val, branchCode: '' }));
                                                }
                                            }
                                        }}
                                        onFocus={() => setShowBranchList(true)}
                                        disabled={!selectedBank}
                                    />
                                    {showBranchList && selectedBank && (
                                        <div className="absolute z-50 top-full left-0 w-full max-h-60 overflow-y-auto bg-brand-dark border border-brand-platinum/20 rounded-lg mt-1 shadow-xl">
                                            {loadingBranches ? <div className="p-3 text-xs text-brand-platinum">Loading branches...</div> :
                                                filteredBranches.length === 0 ? <div className="p-3 text-xs text-brand-platinum">No branches found.</div> :
                                                    filteredBranches.map(branch => (
                                                        <button
                                                            key={branch.code}
                                                            className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 text-sm text-white"
                                                            onClick={() => selectBranch(branch)}
                                                        >
                                                            <span className="text-brand-platinum/60 mr-2 text-xs">{branch.code}</span>
                                                            {branch.name}
                                                        </button>
                                                    ))
                                            }
                                        </div>
                                    )}
                                </div>

                                {/* 3. Type & Number */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-brand-platinum/60 mb-1">Type</label>
                                        <select className="w-full bg-brand-dark border border-brand-platinum/20 rounded-lg p-3 text-white outline-none"
                                            value={bankForm.accountType} onChange={e => setBankForm(prev => ({ ...prev, accountType: e.target.value as any }))}>
                                            <option value="ordinary">普通 (Ordinary)</option>
                                            <option value="current">当座 (Current)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`block text-xs mb-1 ${fieldErrors.accountNumber ? 'text-red-400 font-bold' : 'text-brand-platinum/60'}`}>Number (7 digits) <span className="text-red-400">*</span></label>
                                        <input type="text"
                                            className={`w-full bg-brand-dark border rounded-lg p-3 text-white outline-none font-mono transition-colors ${fieldErrors.accountNumber ? 'border-red-500/50 focus:border-red-500' : 'border-brand-platinum/20 focus:border-brand-blue'}`}
                                            placeholder="1234567"
                                            maxLength={7}
                                            value={bankForm.accountNumber}
                                            onChange={e => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                setBankForm(prev => ({ ...prev, accountNumber: val }));
                                                setFieldErrors(prev => ({ ...prev, accountNumber: false }));
                                            }} />
                                    </div>
                                </div>

                                {/* 4. Holder Name (Read Only with Sync) */}
                                <div>
                                    <label className="block text-xs text-brand-platinum/60 mb-1">Account Holder Name (Auto-Synced) <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        className="w-full bg-brand-dark/50 border border-brand-platinum/10 rounded-lg p-3 text-brand-platinum font-mono cursor-not-allowed"
                                        value={displayHolderName}
                                        readOnly
                                        title="Synced with Profile"
                                    />
                                    <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-300 flex items-start gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-[1px] flex-shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="16" y2="12" /><line x1="12" x2="12.01" y1="8" y2="8" /></svg>
                                        <span>
                                            Name is synced from your profile.<br />
                                            To change it, please update your <a href="/profile" className="underline hover:text-white font-bold">Profile Settings</a>.
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => setSettingBank(false)} className="flex-1 py-3 border border-white/10 text-brand-platinum rounded-xl hover:bg-white/5 transition-all text-sm font-bold">Cancel</button>
                                    <button onClick={handleRegisterBank} disabled={isSubmitting} className="flex-1 py-3 bg-brand-gold text-brand-dark font-bold rounded-xl hover:bg-brand-gold-light transition-all text-sm shadow-lg shadow-brand-gold/10 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isSubmitting ? 'Processing...' : 'Register Bank'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
