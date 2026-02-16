'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import MomentHistoryPanel from '../../../../components/MomentHistoryPanel';
import { createClient } from '../../../../utils/supabase/client';
import { markAsReceived, getBuyerOrderDetails } from '../../../actions/order';
import { getBuyerItemByOrder } from '../../../actions/item';

interface OrderDetail {
    id: string;
    buyer_id: string;
    status: string;
    listing: {
        title: string;
        player_name: string;
        images: string[];
        price: number;
        seller_id: string;
        moment_history?: any[];
    };
    created_at: string;
    tracking_number?: string;
    carrier?: string;
    shipped_at?: string;
    completed_at?: string;
    moment_snapshot?: any | null; // Can be object or array
}

export default function BuyerOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [buyerItem, setBuyerItem] = useState<{ id: string; history: any[] } | null>(null);
    const [activeMoments, setActiveMoments] = useState<any[]>([]);
    const [retryCount, setRetryCount] = useState(0);
    const [user, setUser] = useState<any>(null);

    const fetchOrder = async () => {
        try {
            const supabase = createClient();
            const { data: { user: userData } } = await supabase.auth.getUser();
            setUser(userData);

            const data = await getBuyerOrderDetails(id);
            setOrder(data as any);
            setLoading(false);

            if (data) {
                // 1. Fetch buyer's copy if paid, shipped or completed
                if (['paid', 'shipped', 'completed', 'AwaitingShipment'].includes(data.status)) {
                    const itemData = await getBuyerItemByOrder(id);
                    if (itemData) setBuyerItem(itemData);
                }

                // 2. Detect Active Live Moment: Removed.
                // We rely strictly on snapshots captured at checkout creation.
            }
        } catch (error: any) {
            console.error('Fetch Order Error:', error);
            alert(error.message || '注文が見つかりません');
            router.push('/collection');
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id, router]);

    // Polling for buyerItem (Stripe Webhook might be slow)
    useEffect(() => {
        if (id && !buyerItem && retryCount < 150 && !loading) {
            const timer = setTimeout(() => {
                console.log(`Polling for buyer item (Attempt ${retryCount + 1}/150)...`);
                setRetryCount(prev => prev + 1);
                fetchOrder();
            }, 2000); // Poll every 2 seconds
            return () => clearTimeout(timer);
        }
    }, [id, buyerItem, retryCount, loading]);

    const handleReceive = async () => {
        if (!confirm('商品を受け取りましたか？この操作で取引が完了し、販売者への決済が確定します。この操作は取り消しできません。')) return;

        setSubmitting(true);
        try {
            await markAsReceived(id);
            alert('取引が完了しました！');
            window.location.reload();
        } catch (error: any) {
            alert(error.message || 'ステータスの更新に失敗しました');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-brand-dark flex items-center justify-center text-white">読み込み中...</div>;
    if (!order) return null;

    return (
        <div className="min-h-screen bg-brand-dark text-white pt-24 pb-12 px-4">
            <div className="max-w-2xl mx-auto glass-panel-premium rounded-2xl p-8 border border-white/10">
                <h1 className="text-2xl font-bold font-heading mb-6 flex items-center justify-between">
                    <span>注文状況</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium tracking-wider
                        ${order.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                        {order.status === 'completed' ? '完了' :
                            order.status === 'shipped' ? '配送中' :
                                order.status === 'paid' || order.status === 'awaiting_shipping' ? '発送準備中' :
                                    order.status === 'pending' ? '決済処理中' : order.status}
                    </span>
                </h1>

                {/* Moment Certificates */}
                {order.moment_snapshot && (
                    <div className="flex flex-col gap-4 mb-8">
                        {(Array.isArray(order.moment_snapshot) ? order.moment_snapshot : [order.moment_snapshot]).map((moment: any, idx: number) => (
                            <div key={moment.id || idx} className="relative overflow-hidden rounded-xl p-[2px] bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 animate-gradient-xy shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                                <div className="bg-black/90 rounded-[10px] p-6 relative overflow-hidden backdrop-blur-xl">
                                    {/* Decorative Background Elements */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] rounded-full pointer-events-none" />
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-500/10 blur-[50px] rounded-full pointer-events-none" />

                                    <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                                        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-red-600 flex items-center justify-center text-3xl shadow-lg">
                                            🏆
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">
                                                    Moment Captured / 伝説の瞬間
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${moment.is_finalized ? 'bg-green-500' : 'bg-red-500 animate-pulse'} text-white`}>
                                                    {moment.is_finalized ? 'MATCH END' : 'LIVE'}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-1">
                                                {moment.title}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-platinum/80">
                                                <span className="flex items-center gap-1">
                                                    <span className="text-brand-gold">選手:</span> {moment.player_name}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="text-brand-gold">時刻:</span> {new Date(moment.created_at).toLocaleString('ja-JP')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="mt-2 text-xs text-center text-brand-platinum/60 italic font-serif">
                            "このカードは、これらの歴史的瞬間の熱狂の中で取引されました。"
                        </div>
                    </div>
                )}

                {/* Item Summary */}
                <div className="flex gap-4 mb-8 bg-white/5 p-4 rounded-xl border border-white/5">
                    {order.listing.images?.[0] && (
                        <div className="w-20 h-28 relative rounded overflow-hidden">
                            <img src={order.listing.images[0]} alt="Item" className="object-cover w-full h-full" />
                        </div>
                    )}
                    <div>
                        <h2 className="font-bold text-lg">{order.listing.player_name}</h2>
                        <p className="text-brand-platinum/60 text-sm">{order.listing.title}</p>
                        <p className="text-brand-gold font-mono mt-1">¥{order.listing.price.toLocaleString()}</p>
                    </div>
                </div>

                {/* Tracking Info */}
                {(order.status === 'shipped' || order.status === 'completed') && (
                    <div className="mb-8 p-6 bg-brand-blue/5 border border-brand-blue/10 rounded-xl">
                        <h3 className="text-brand-blue font-bold mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                            配送情報
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-brand-platinum/60 uppercase">配送業者</p>
                                <p className="font-bold text-lg">{order.carrier || '未指定'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-brand-platinum/60 uppercase">追跡番号</p>
                                <p className="font-mono text-lg tracking-wider">{order.tracking_number || '追跡番号なし'}</p>
                            </div>
                        </div>
                        {order.shipped_at && (
                            <p className="text-xs text-brand-platinum/40 mt-4 text-right">発送日: {new Date(order.shipped_at).toLocaleString('ja-JP')}</p>
                        )}
                    </div>
                )}

                {/* Moment History Logic */}
                {(() => {
                    const displayHistory = [...(buyerItem?.history || order.listing?.moment_history || [])];

                    // 1. Snapshot Injection: Moments captured at time of purchase
                    // These should ALWAYS be visible throughout the order lifecycle.
                    const snapshots = order.moment_snapshot ? (Array.isArray(order.moment_snapshot) ? order.moment_snapshot : [order.moment_snapshot]) : [];
                    snapshots.forEach((sm: any) => {
                        if (!displayHistory.some((m: any) => (m.moment_id === sm.id) || (m.id === sm.id))) {
                            displayHistory.push({
                                ...sm,
                                moment_id: sm.id,
                                status: 'recorded', // Mark as recorded (historical but confirmed)
                                is_snapshot: true
                            });
                        }
                    });

                    // 2. Virtual Moment Injection: Removed as per user request.
                    // Only moments captured in the snapshot (at checkout time) should be displayed.
                    if (displayHistory.length === 0) {
                        if (!buyerItem && retryCount < 10 && ['paid', 'shipped', 'completed'].includes(order.status)) {
                            return (
                                <div className="p-8 rounded-xl bg-white/5 border border-dashed border-white/10 text-center mb-8">
                                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-brand-gold mb-2"></div>
                                    <p className="text-xs text-brand-platinum/30 uppercase tracking-widest">
                                        カード情報を準備中...
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    }

                    return (
                        <>
                            {/* Memory Tagging CTA */}
                            {['paid', 'shipped', 'completed'].includes(order.status) && (
                                <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-brand-gold/20 via-brand-gold/5 to-transparent border border-brand-gold/30 relative overflow-hidden group shadow-xl">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <span className="text-6xl text-brand-gold">✍️</span>
                                    </div>
                                    <div className="relative z-10 text-center">
                                        <h3 className="text-lg font-bold text-white mb-2">
                                            <span className="text-brand-gold">Legendary History</span> - あなたの想い出を刻みませんか？
                                        </h3>
                                        <p className="text-sm text-brand-platinum/70 leading-relaxed max-w-lg mx-auto">
                                            下記の「Legendary History」セクションの各瞬間の横にあるボタン <span className="inline-block p-1 bg-white/10 rounded-md"><svg className="w-3 h-3 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></span> から、<br />
                                            あなただけのストーリーや想い出をカードに刻むことができます。
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* History Panel */}
                            <div id="history-panel">
                                <MomentHistoryPanel
                                    history={displayHistory}
                                    itemId={buyerItem?.id || undefined}
                                    isOwner={!!(user && order && user.id === order.buyer_id)}
                                    onSuccess={fetchOrder}
                                />
                            </div>
                        </>
                    );
                })()}

                {/* Action Area */}
                {order.status === 'shipped' ? (
                    <div className="mb-8">
                        <div className="p-4 bg-brand-gold/10 border border-brand-gold/20 rounded-lg text-brand-gold mb-4 text-sm">
                            商品の状態を確認した上で、受取確認を行ってください。この操作は取り消しできません。
                        </div>
                        <button
                            onClick={handleReceive}
                            disabled={submitting}
                            className="w-full bg-brand-gold text-brand-dark font-bold py-4 rounded-xl hover:bg-brand-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-gold/20"
                        >
                            {submitting ? '処理中...' : '✅ 受取確認（取引完了）'}
                        </button>
                    </div>
                ) : order.status === 'completed' ? (
                    <div className="mb-8 p-6 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                        <h3 className="text-green-400 font-bold text-xl mb-2">取引完了</h3>
                        <p className="text-brand-platinum/60 text-sm">ご購入いただきありがとうございました。</p>
                    </div>
                ) : order.status === 'processing' || order.status === 'open' || order.status === 'pending' ? (
                    <div className="mb-8 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-yellow-500 mb-4"></div>
                        <h3 className="text-yellow-400 font-bold text-xl mb-2">決済処理中</h3>
                        <p className="text-brand-platinum/60 text-sm">
                            お支払いを確認中です。通常数分で完了します。<br />
                            確認完了後、注文状況が更新されます。
                        </p>
                        <button onClick={() => window.location.reload()} className="mt-4 text-xs text-yellow-500/80 hover:text-yellow-400 underline">
                            ステータスを再確認
                        </button>
                    </div>
                ) : (
                    <div className="mb-8 p-6 bg-white/5 border border-white/10 rounded-xl text-center text-brand-platinum/60">
                        販売者が発送準備を行っています。しばらくお待ちください。
                    </div>
                )}

                <button onClick={() => router.back()} className="text-brand-platinum hover:text-white transition-colors text-sm">
                    &larr; コレクションに戻る
                </button>
            </div>
        </div >
    );
}
