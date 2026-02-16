'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '../../../../utils/supabase/client';
import { getBuyerItemByOrder } from '../../../../app/actions/item';
import MomentHistoryPanel from '../../../../components/MomentHistoryPanel';

export default function OrderSuccessPage() {
    const params = useParams();
    const id = params.id as string;

    const [order, setOrder] = useState<any>(null);
    const [buyerItem, setBuyerItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeMoments, setActiveMoments] = useState<any[]>([]);
    const [retryCount, setRetryCount] = useState(0);
    const [user, setUser] = useState<any>(null);

    const fetchData = async () => {
        const supabase = createClient();

        // 0. Fetch User
        const { data: { user: userData } } = await supabase.auth.getUser();
        setUser(userData);

        // 1. Fetch order with listing details
        const { data: orderData } = await supabase
            .from('orders')
            .select('*, listing:listing_items!listing_id(*)')
            .eq('id', id)
            .single();

        if (orderData) {
            setOrder(orderData);

            // 2. Detect Active Live Moment for this player
            const playerName = orderData.listing?.player_name;
            if (playerName) {
                const now = new Date();
                const lookback = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
                const listingPlayerName = playerName.toLowerCase();

                const { data: moments } = await supabase
                    .from('live_moments')
                    .select('*')
                    .gt('created_at', lookback)
                    .order('created_at', { ascending: false });

                if (moments) {
                    const matched = moments.filter(m => {
                        const activePlayer = (m.player_name || '').toLowerCase();
                        return listingPlayerName.includes(activePlayer) || activePlayer.includes(listingPlayerName);
                    });
                    setActiveMoments(matched);
                }
            }

            // 3. Try to find the buyer's cloned item
            const item = await getBuyerItemByOrder(id);
            if (item) {
                setBuyerItem(item);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    // Polling for buyerItem (Stripe Webhook might be slow)
    useEffect(() => {
        if (id && !buyerItem && retryCount < 150 && !loading) {
            const timer = setTimeout(() => {
                console.log(`Polling for buyer item (Attempt ${retryCount + 1}/150)...`);
                setRetryCount(prev => prev + 1);
                fetchData();
            }, 2000); // Poll every 2 seconds
            return () => clearTimeout(timer);
        }
    }, [id, buyerItem, retryCount, loading]);

    if (loading && retryCount === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue"></div>
            </div>
        );
    }

    const listing = order?.listing;

    return (
        <div className="min-h-screen bg-brand-dark py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            <div className="w-full max-w-2xl">
                <div className="glass-panel-premium py-10 px-6 sm:px-10 shadow-2xl rounded-2xl text-center border border-white/10 relative overflow-hidden">
                    {/* Decorative Background */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-blue/10 rounded-full blur-[80px]"></div>
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-gold/5 rounded-full blur-[80px]"></div>

                    <div className="relative z-10">
                        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-brand-blue/20 mb-6 border border-brand-blue/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                            <svg className="h-10 w-10 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h2 className="text-3xl font-heading font-bold text-white mb-2 tracking-tight">購入が完了しました！</h2>
                        <p className="text-brand-platinum/60 mb-8 max-w-md mx-auto">
                            ご注文ありがとうございます。決済が完了し、カードがあなたのコレクションに追加されました。
                        </p>

                        {/* Order ID Box */}
                        <div className="bg-black/40 rounded-xl p-4 mb-8 border border-white/5 inline-block mx-auto">
                            <p className="text-[10px] text-brand-platinum/40 uppercase tracking-widest mb-1 font-bold">注文ID</p>
                            <p className="font-mono text-xs text-brand-blue-glow break-all px-4">{id}</p>
                        </div>

                        {/* Card Details Summary */}
                        {listing && (
                            <div className="bg-brand-dark-light/40 rounded-2xl p-6 mb-8 border border-brand-gold/20 flex flex-col sm:flex-row items-center gap-6 text-left group">
                                <div className="relative w-32 h-44 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 shadow-xl group-hover:border-brand-gold/50 transition-colors">
                                    <Image
                                        src={listing.images?.[0] || '/placeholder-card.png'}
                                        alt={listing.player_name || 'Card'}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="flex-1">
                                    <p className="text-brand-gold text-xs font-bold uppercase tracking-widest mb-1">新規取得</p>
                                    <h3 className="text-2xl font-bold text-white mb-1">{listing.player_name}</h3>
                                    <p className="text-brand-platinum/70 text-sm mb-4">
                                        {listing.year} {listing.manufacturer} {listing.series_name}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-bold text-brand-platinum/50 border border-white/10">#{listing.card_number}</span>
                                        {listing.is_rookie && <span className="px-2 py-1 bg-brand-gold/10 rounded text-[10px] font-bold text-brand-gold border border-brand-gold/20">ROOKIE</span>}
                                        <span className="px-2 py-1 bg-brand-blue/10 rounded text-[10px] font-bold text-brand-blue border border-brand-blue/20 uppercase">{listing.condition_grading?.score || 'RAW'}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Moment History (Legendary Log) */}
                        <div className="text-left mb-8 border-t border-white/5 pt-8">
                            <h3 className="text-xs font-bold text-brand-platinum/40 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse"></span>
                                {buyerItem ? "カードの伝説を始めましょう" : (retryCount < 10 ? "カード情報を準備中..." : "同期に時間がかかっています - コレクションから後で追加できます")}
                            </h3>
                            {(() => {
                                let displayHistory = [...(buyerItem?.history || listing?.moment_history || [])];

                                // Virtual Moment Injection: 
                                // Check if active live moments are captured in the snapshot (Owned) or are new (Virtual).
                                const snapshotIds = order?.moment_snapshot
                                    ? (Array.isArray(order.moment_snapshot) ? order.moment_snapshot.map((s: any) => s.id) : [order.moment_snapshot.id])
                                    : [];

                                activeMoments.forEach(am => {
                                    if (!displayHistory.some(m => m.moment_id === am.id)) {
                                        // If this active moment is in the snapshot, it's REAL (Owned History), so allow editing.
                                        const isCaptured = snapshotIds.includes(am.id);
                                        const isVirtual = !isCaptured;

                                        displayHistory.push({
                                            moment_id: am.id,
                                            title: am.title,
                                            description: am.description,
                                            timestamp: am.created_at,
                                            status: 'live',
                                            player_name: am.player_name,
                                            intensity: am.intensity,
                                            match_result: am.match_result,
                                            is_virtual: isVirtual
                                        });
                                    }
                                });

                                if (displayHistory.length === 0 && !buyerItem) {
                                    return (
                                        <div className="p-8 rounded-xl bg-white/5 border border-dashed border-white/10 text-center">
                                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-brand-gold mb-2"></div>
                                            <p className="text-xs text-brand-platinum/30 uppercase tracking-widest">
                                                {retryCount < 10 ? "所有権を同期中..." : "同期に時間がかかっています"}
                                            </p>
                                        </div>
                                    );
                                }

                                return (
                                    <MomentHistoryPanel
                                        history={displayHistory}
                                        itemId={buyerItem?.id || undefined}
                                        isOwner={!!(user && order && user.id === order.buyer_id)}
                                        onSuccess={fetchData}
                                    />
                                );
                            })()}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 mt-10">
                            <Link
                                href="/collection"
                                className="flex-1 flex justify-center items-center py-4 px-6 rounded-xl text-sm font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                コレクションへ
                            </Link>
                            <Link
                                href="/market"
                                className="flex-1 flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] text-sm font-bold text-white bg-brand-blue hover:bg-brand-blue-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                マーケットに戻る
                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </Link>
                        </div>

                        <p className="mt-8 text-[10px] text-brand-platinum/30 uppercase tracking-[0.2em] font-light">
                            Stadium Card Chain による安全な取引
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
