'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '../../utils/supabase/client';
import Link from 'next/link';
import Footer from '../../components/Footer';
import { getAvailableBalance } from '../../app/actions/payout';
import { getCompletedSales, getCompletedPurchases, getSellerOrders } from '../actions/order';
import OrderHistory from '../../components/OrderHistory';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'purchases' | 'sales'>('sales');
    const [isEditing, setIsEditing] = useState(false);
    const [editDisplayName, setEditDisplayName] = useState('');
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPostalCode, setEditPostalCode] = useState('');
    const [editAddressLine1, setEditAddressLine1] = useState('');
    const [editAddressLine2, setEditAddressLine2] = useState('');
    const [editPhoneNumber, setEditPhoneNumber] = useState('');
    const [editRealNameKana, setEditRealNameKana] = useState('');
    const [balance, setBalance] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    // Dynamic stats
    const [listingsCount, setListingsCount] = useState(0);
    const [salesAmount, setSalesAmount] = useState(0);
    const [purchasesCount, setPurchasesCount] = useState(0);

    useEffect(() => {
        const fetchUserAndProfile = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            setUser(user);
            setEditEmail(user.email || '');

            // Fetch profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileData) {
                setProfile(profileData);
                setEditDisplayName(profileData.display_name || profileData.name || user.user_metadata?.name || '');
                setEditFirstName(profileData.first_name || '');
                setEditLastName(profileData.last_name || '');
                setEditPostalCode(profileData.postal_code || '');
                setEditAddressLine1(profileData.address_line1 || '');
                setEditAddressLine2(profileData.address_line2 || '');
                setEditPhoneNumber(profileData.phone_number || '');
                setEditRealNameKana(profileData.real_name_kana || '');
            } else {
                setEditDisplayName(user.user_metadata?.name || '');
            }

            // Fetch Balance
            try {
                const balanceData = await getAvailableBalance(user.id);
                setBalance(balanceData.available);
            } catch (e) {
                console.error("Failed to load balance", e);
                setBalance(0);
            }

            // Fetch Stats
            try {
                const [completedSales, completedPurchases, allSales] = await Promise.all([
                    getCompletedSales(),
                    getCompletedPurchases(),
                    getSellerOrders()
                ]);

                setListingsCount(allSales.length);
                setSalesAmount(completedSales.reduce((acc: number, o: any) => acc + (o.net_earnings || o.total_amount || 0), 0));
                setPurchasesCount(completedPurchases.length);
            } catch (e) {
                console.error('Failed to load stats', e);
            }

            setLoading(false);
        };

        fetchUserAndProfile();
    }, [router]);

    const handleSave = async () => {
        if (!user?.id) return;
        setSaving(true);
        try {
            const supabase = createClient();

            // Sanitize: Remove all spaces (half/full width) from Kana
            const sanitizedKana = editRealNameKana.replace(/[\s\u3000]+/g, '');

            // Validate: Must be Full-width Katakana if provided
            if (sanitizedKana && !/^[\u30A0-\u30FF]+$/.test(sanitizedKana)) {
                alert('Real Name (Kana) must be in full-width Katakana only (no Kanji, Hiragana, or Latin letters).');
                setSaving(false);
                return;
            }

            // Update Profile Table
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    display_name: editDisplayName,
                    first_name: editFirstName,
                    last_name: editLastName,
                    // name: editDisplayName, // Optional: duplicate to name for compat
                    email: user.email,
                    postal_code: editPostalCode,
                    address_line1: editAddressLine1,
                    address_line2: editAddressLine2,
                    phone_number: editPhoneNumber,
                    real_name_kana: sanitizedKana,
                    updated_at: new Date().toISOString(),
                });

            if (profileError) throw profileError;

            // Update Auth Metadata (optional, but good for consistency)
            /* const { error: authError } = await supabase.auth.updateUser({
                data: { name: editDisplayName },
            }); */

            // if (authError) throw authError;

            setProfile({
                ...profile,
                display_name: editDisplayName,
                first_name: editFirstName,
                last_name: editLastName,
                postal_code: editPostalCode,
                address_line1: editAddressLine1,
                address_line2: editAddressLine2,
                phone_number: editPhoneNumber,
                real_name_kana: sanitizedKana
            });
            setIsEditing(false);
            setEditRealNameKana(sanitizedKana); // Update state to sanitized version
            alert('プロフィールを更新しました！');

        } catch (error) {
            console.error(error);
            alert('プロフィールの更新に失敗しました。');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-dark flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue"></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col">
            <div className="flex-1 container mx-auto px-4 py-24 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto space-y-8">
                    {/* Header Section */}
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl font-heading font-bold text-white tracking-tight">
                            マイページ
                        </h1>
                        <p className="text-brand-platinum/60">
                            アカウント設定の管理とアクティビティの確認
                        </p>
                    </div>

                    {/* Profile Card */}
                    <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-brand-platinum/10 relative overflow-hidden group">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-brand-blue/20 transition-all duration-700"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-start gap-8">
                            {/* Avatar */}
                            <div className="relative flex-shrink-0 mx-auto md:mx-0">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-blue to-brand-blue-glow p-[2px] shadow-lg shadow-brand-blue/20">
                                    <div className="w-full h-full rounded-full bg-brand-dark-light overflow-hidden">
                                        <img
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Guest'}`}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full border-4 border-brand-dark-light flex items-center justify-center" title="Active">
                                    <div className="w-full h-full rounded-full animate-pulse bg-green-400/50"></div>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-center md:text-left space-y-4 w-full">
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-brand-platinum/60 mb-1">ニックネーム</label>
                                                <input
                                                    type="text"
                                                    value={editDisplayName}
                                                    onChange={(e) => setEditDisplayName(e.target.value)}
                                                    placeholder="e.g. CardMaster2024"
                                                    className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-blue"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-brand-platinum/60 mb-1">姓</label>
                                                    <input
                                                        type="text"
                                                        value={editLastName}
                                                        onChange={(e) => setEditLastName(e.target.value)}
                                                        placeholder="山田"
                                                        className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-blue"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-brand-platinum/60 mb-1">名</label>
                                                    <input
                                                        type="text"
                                                        value={editFirstName}
                                                        onChange={(e) => setEditFirstName(e.target.value)}
                                                        placeholder="太郎"
                                                        className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-blue"
                                                    />
                                                </div>
                                            </div>

                                            {/* Real Name Kana Input */}
                                            <div>
                                                <label className="block text-sm font-medium text-brand-platinum/60 mb-1">氏名（カタカナ） <span className="text-red-400 text-xs">*出金に必要</span></label>
                                                <input
                                                    type="text"
                                                    value={editRealNameKana}
                                                    onChange={(e) => setEditRealNameKana(e.target.value)}
                                                    placeholder="ヤマダタロウ"
                                                    pattern="^[\u30A0-\u30FF]+$"
                                                    title="Full-width Katakana only"
                                                    className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-blue"
                                                />
                                                <p className="text-[10px] text-brand-platinum/50 mt-1">※ 銀行口座名義と一致させてください (姓と名の間のスペースなし)</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-brand-platinum/60 mb-1">メールアドレス</label>
                                                <input
                                                    type="email"
                                                    value={editEmail}
                                                    onChange={(e) => setEditEmail(e.target.value)}
                                                    disabled
                                                    className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-lg px-4 py-2 text-white/50 cursor-not-allowed focus:outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="border-t border-brand-platinum/10 pt-4 mt-4">
                                            <h3 className="text-white font-bold mb-3">配送先住所</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-brand-platinum/60 mb-1">郵便番号</label>
                                                    <input
                                                        type="text"
                                                        value={editPostalCode}
                                                        onChange={(e) => setEditPostalCode(e.target.value)}
                                                        placeholder="123-4567"
                                                        className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-blue"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-brand-platinum/60 mb-1">電話番号</label>
                                                    <input
                                                        type="tel"
                                                        value={editPhoneNumber}
                                                        onChange={(e) => setEditPhoneNumber(e.target.value)}
                                                        placeholder="090-1234-5678"
                                                        className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-blue"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-brand-platinum/60 mb-1">Address Line 1 (都道府県・市区町村)</label>
                                                <input
                                                    type="text"
                                                    value={editAddressLine1}
                                                    onChange={(e) => setEditAddressLine1(e.target.value)}
                                                    placeholder="Tokyo, Minato-ku"
                                                    className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-blue"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-brand-platinum/60 mb-1">Address Line 2 (番地・建物名)</label>
                                                <input
                                                    type="text"
                                                    value={editAddressLine2}
                                                    onChange={(e) => setEditAddressLine2(e.target.value)}
                                                    placeholder="Roppongi 1-2-3, Hills Tower 4F"
                                                    className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-blue"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-1">
                                            {profile?.display_name || editDisplayName || 'No Nickname'}
                                        </h2>
                                        <p className="text-brand-platinum/60 font-mono text-sm mb-4">
                                            @{profile?.email?.split('@')[0] || 'username'}
                                        </p>

                                        {(profile?.address_line1 || profile?.postal_code || profile?.real_name_kana) && (
                                            <div className="bg-brand-dark-light/30 p-4 rounded-xl border border-brand-platinum/10 text-left">
                                                <h3 className="text-xs font-bold text-brand-platinum uppercase tracking-wider mb-2">Shipping Information</h3>
                                                <p className="text-white text-sm font-bold mb-1">
                                                    {profile.last_name} {profile.first_name}
                                                    {profile.real_name_kana && <span className="text-xs font-normal text-brand-platinum/60 ml-2">({profile.real_name_kana})</span>}
                                                </p>
                                                <p className="text-brand-platinum/80 text-sm">
                                                    〒{profile.postal_code}<br />
                                                    {profile.address_line1}<br />
                                                    {profile.address_line2}<br />
                                                    {profile.phone_number && <span className="text-brand-platinum/60 mt-1 block">{profile.phone_number}</span>}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!isEditing && (
                                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                        <span className="px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold border border-brand-blue/20">
                                            MEMBER
                                        </span>
                                        <span className="px-3 py-1 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-bold border border-brand-gold/20">
                                            EARLY ADOPTER
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 w-full md:w-auto">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-6 py-2 rounded-xl bg-brand-blue hover:bg-brand-blue-glow text-white font-bold text-sm shadow-lg shadow-brand-blue/20 transition-all text-center disabled:opacity-50"
                                        >
                                            {saving ? '保存中...' : '変更を保存'}
                                        </button>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            disabled={saving}
                                            className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/10 transition-all"
                                        >
                                            キャンセル
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/10 transition-all"
                                        >
                                            プロフィール編集
                                        </button>
                                        <Link href="/collection" className="px-6 py-2 rounded-xl bg-brand-blue hover:bg-brand-blue-glow text-white font-bold text-sm shadow-lg shadow-brand-blue/20 transition-all text-center">
                                            マイコレクション
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Wallet Card */}
                    <div className="bg-gradient-to-r from-gray-900 to-black border border-yellow-600/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-600/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-yellow-600/20 transition-all duration-700"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h3 className="text-yellow-600/80 text-sm font-bold tracking-widest uppercase mb-1">売上金残高</h3>
                                <div className="text-4xl md:text-5xl font-heading font-bold text-white tracking-tight flex items-baseline gap-2">
                                    <span className="text-2xl text-white/50">¥</span>
                                    {balance !== null ? balance.toLocaleString() : '---'}
                                </div>
                            </div>

                            <Link
                                href="/payouts"
                                className="px-8 py-3 rounded-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold shadow-lg shadow-yellow-600/20 transition-all transform hover:scale-105"
                            >
                                出金申請
                            </Link>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: '出品数', value: listingsCount.toString(), icon: '📋' },
                            { label: '売上', value: `¥${salesAmount.toLocaleString()}`, icon: '💰' },
                            { label: '購入数', value: purchasesCount.toString(), icon: '🛍️' },
                        ].map((stat, i) => (
                            <div key={i} className="glass-panel p-6 rounded-2xl border border-brand-platinum/5 hover:border-brand-platinum/20 transition-all group">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-brand-platinum/60 text-sm font-bold">{stat.label}</span>
                                    <span className="text-xl group-hover:scale-110 transition-transform">{stat.icon}</span>
                                </div>
                                <div className="text-2xl font-heading font-bold text-white group-hover:text-brand-blue-glow transition-colors">
                                    {stat.value}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Transaction History */}
                    <div className="space-y-6 pt-8 border-t border-brand-platinum/10">
                        <div className="flex items-center gap-8 border-b border-brand-platinum/10">
                            <button
                                onClick={() => setActiveTab('sales')}
                                className={`pb-3 text-sm font-bold tracking-wider transition-all border-b-2 ${activeTab === 'sales' ? 'text-white border-brand-gold' : 'text-brand-platinum/40 border-transparent hover:text-brand-platinum'}`}
                            >
                                販売履歴
                            </button>
                            <button
                                onClick={() => setActiveTab('purchases')}
                                className={`pb-3 text-sm font-bold tracking-wider transition-all border-b-2 ${activeTab === 'purchases' ? 'text-white border-brand-blue' : 'text-brand-platinum/40 border-transparent hover:text-brand-platinum'}`}
                            >
                                購入履歴
                            </button>
                        </div>

                        <div className="min-h-[200px]">
                            <OrderHistory mode={activeTab === 'purchases' ? 'buy' : 'sell'} />
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
