'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Footer from '../../components/Footer';
import { createClient } from '../../utils/supabase/client';
import AddToShowcaseModal from '../../components/AddToShowcaseModal';
import ShowcaseCard from '../../components/ShowcaseCard';
import PurchaseAnimation from '../../components/PurchaseAnimation';
import SkeletonCard from '../../components/SkeletonCard';
import { deleteItem, restoreItem } from '../actions/item';

// Types
import { ListingItem } from '../../types';

interface OrderItem {
    id: string;
    listing_id: string;
    status: string;
    total_amount: number;
    tracking_number?: string;
    listing?: ListingItem;
    created_at: string;
    completed_at?: string;
}

function MyPageContent() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const isDebugLive = searchParams.get('live') === 'true'; // Debug Mode

    const [activeTab, setActiveTab] = useState<'showcase' | 'listings' | 'orders' | 'archive'>('showcase');
    const [filter, setFilter] = useState<'All' | 'Draft' | 'Active' | 'Display'>('All');
    const [showcaseItems, setShowcaseItems] = useState<any[]>([]);
    const [archivedItems, setArchivedItems] = useState<any[]>([]);
    const [myListings, setMyListings] = useState<ListingItem[]>([]);
    const [myOrders, setMyOrders] = useState<OrderItem[]>([]);

    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showAnimation, setShowAnimation] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.log('[Collection] No user found, redirecting to login');
            router.push('/login');
            setLoading(false);
            return;
        }
        setUser(user);
        setCurrentUserId(user.id);

        try {
            // Fetch All My Items (Listings + Collection)
            const { data: listingsData } = await supabase
                .from('listing_items')
                .select('*, orders:orders!listing_id(*), origin_order:orders!origin_order_id(id, status, moment_snapshot)') // Left Join (Removed !)
                .eq('seller_id', user.id);

            const activeItemsRaw = listingsData?.filter(i => !i.deleted_at) || [];
            const archivedItemsRaw = listingsData?.filter(i => !!i.deleted_at) || [];

            // Fetch Active Live Moments to tag items
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const { data: recentMoments } = await supabase
                .from('live_moments')
                .select('*')
                .gt('created_at', oneHourAgo);

            const livePlayerNames = new Set(recentMoments?.map(m => (m.player_name || '').toLowerCase()) || []);

            const tagWithLive = (item: any) => {
                if (!item) return null;

                // Live Moments enabled for ALL items (as per user request to boost selling intent)
                // Originally restricted to Active, now globally enabled for "Opportunity" notification.

                const playerName = (item.player_name || '').toLowerCase();
                const matchedMoments = recentMoments?.filter(m => {
                    const mName = (m.player_name || '').toLowerCase();
                    return playerName.includes(mName) || mName.includes(playerName);
                }) || [];

                return {
                    ...item,
                    is_live_moment: matchedMoments.length > 0,
                    live_moments: matchedMoments, // Full array for multi-badge
                    moment_created_at: matchedMoments[0]?.created_at || null // For legacy single-badge if needed
                };
            };

            // Helper for merging moments from order snapshots into item history
            const mergeOrderMoments = (item: any, orderData: any) => {
                if (!item || !orderData || !orderData.moment_snapshot) return item;

                const snapshots = Array.isArray(orderData.moment_snapshot) ? orderData.moment_snapshot : [orderData.moment_snapshot];
                const history = Array.isArray(item.moment_history) ? item.moment_history : [];

                const missingSnapshots = snapshots.filter((sn: any) =>
                    !history.some((h: any) => (h.moment_id === sn.id) || (h.id === sn.id))
                );

                if (missingSnapshots.length > 0) {
                    item.moment_history = [
                        ...history,
                        ...missingSnapshots.map((sn: any) => ({
                            moment_id: sn.id,
                            timestamp: sn.created_at || new Date().toISOString(),
                            title: sn.title,
                            player_name: sn.player_name,
                            intensity: sn.intensity,
                            description: sn.description,
                            match_result: sn.match_result,
                            owner_at_time: orderData.id,
                            status: 'finalized'
                        }))
                    ];
                }
                return item;
            };

            // Selling Tab: Active Transactions (Persistent Model: Query from orders)
            const { data: pendingSalesData } = await supabase
                .from('orders')
                .select('*, listing:listing_items!listing_id(*)')
                .eq('seller_id', user.id)
                .is('completed_at', null);

            console.log('[Collection] Pending Sales:', pendingSalesData?.length || 0);

            const activeMyListings = (pendingSalesData || []).map(order => ({
                ...order.listing,
                orders: order // Pass order for Manage link
            })).map(tagWithLive).filter(item => item !== null);
            setMyListings(activeMyListings as any);



            // Buying Tab: Active Transactions only
            const { data: ordersData } = await supabase
                .from('orders')
                .select('*, listing:listing_items!listing_id(*)')
                .eq('buyer_id', user.id);

            const activeMyOrders = (ordersData?.filter(order => {
                const orderStatus = (order.status || '').toLowerCase();
                return ['pending', 'paid', 'awaiting_shipping', 'shipped', 'delivered'].includes(orderStatus);
            }) || []).map(order => {
                const listing = order.listing ? mergeOrderMoments(order.listing, order) : null;
                return {
                    ...order,
                    listing: listing ? tagWithLive(listing) : null
                };
            }).filter(o => o.listing !== null);
            setMyOrders(activeMyOrders as any || []);



            // Workspace Tab: Aggregated View
            const workspaceListings = (activeItemsRaw?.filter(item => {
                // Mandatory Filter: Must be Active, Display, or Draft (or Completed as fallback)
                const isCorrectStatus = ['Active', 'Display', 'Draft', 'Completed', 'completed'].includes(item.status);

                // Extra Protection: If it's a purchased clone (has origin_order_id), 
                // it MUST have a completed order to show up in Workspace.
                // If it's not a clone (origin_order_id is null), it's a seller's item, show normally.
                const originOrder = Array.isArray(item.origin_order) ? item.origin_order[0] : item.origin_order;
                const isTransactionComplete = !item.origin_order_id || (originOrder?.status === 'completed');

                return isCorrectStatus && isTransactionComplete;
            }) || []).map(item => {
                // Self-Healing: Merge moment_snapshot from origin_order into history if missing
                let originOrder = Array.isArray(item.origin_order) ? item.origin_order[0] : item.origin_order;

                // Fallback: If origin_order is missing link, look for my purchase order in related orders
                if (!originOrder && item.orders) {
                    const relatedOrders = Array.isArray(item.orders) ? item.orders : [item.orders];
                    const myPurchase = relatedOrders.find((o: any) =>
                        o.buyer_id === user.id &&
                        (o.status === 'completed' || o.status === 'shipped' || o.status === 'paid' || o.status === 'delivered')
                    );
                    if (myPurchase) {
                        originOrder = myPurchase;
                    }
                }

                return mergeOrderMoments(item, originOrder);
            }).map(tagWithLive);

            // Archive Tab
            const archiveListings = (archivedItemsRaw || []).map(tagWithLive);
            setArchivedItems(archiveListings);

            const aggregated = [
                ...workspaceListings.map(item => ({ type: 'listed', ...item }))
            ];
            setShowcaseItems(aggregated);

        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };


    const handleDeleteCollectionItem = async (id: string) => {
        if (!confirm('このアイテムをアーカイブしますか？履歴タブに移動します。')) return;

        try {
            await deleteItem(id);
            fetchData();
        } catch (error) {
            console.error('Failed to archive item:', error);
            alert('アーカイブに失敗しました');
        }
    };

    const handleRestoreCollectionItem = async (id: string) => {
        if (!confirm('このアイテムをコレクションに復元しますか？')) return;

        try {
            await restoreItem(id);
            fetchData();
        } catch (error) {
            console.error('Failed to restore item:', error);
            alert('復元に失敗しました');
        }
    };

    const handleToggleDisplay = async (id: string, currentStatus: string) => {
        let newStatus = 'Draft';
        if (currentStatus === 'Draft') newStatus = 'Display';
        if (currentStatus === 'Active') newStatus = 'Display'; // Active -> Display
        if (currentStatus === 'Display') newStatus = 'Draft';

        const supabase = createClient();

        const { error } = await supabase
            .from('listing_items')
            .update({
                status: newStatus,
                deleted_at: null // Restoration safety
            })
            .eq('id', id);

        if (error) {
            console.error('Failed to update status:', error);
            alert('ステータスの変更に失敗しました');
        } else {
            fetchData();
        }
    };

    const handleCancelListing = async (id: string) => {
        if (!confirm('この出品を取り消しますか？下書きに戻ります。')) return;

        const supabase = createClient();

        try {
            // Mark listing as Draft (Soft Delete from Marketplace, but keeps in DB)
            const { error: updateError } = await supabase
                .from('listing_items')
                .update({
                    status: 'Draft',
                    deleted_at: null // Restoration safety 
                })
                .eq('id', id);

            if (updateError) throw updateError;

            fetchData();

        } catch (error) {
            console.error('Failed to cancel listing:', error);
            alert('出品の取り消しに失敗しました');
        }
    };

    const handleShipItem = async (listingId: string) => {
        if (!confirm('出荷準備が完了しましたか？')) return;

        const supabase = createClient();
        const { error } = await supabase
            .from('listing_items')
            .update({ status: 'Shipped' })
            .eq('id', listingId);

        if (error) {
            console.error('Failed to ship item:', error);
            alert('出荷更新に失敗しました');
        } else {
            fetchData();
        }
    };



    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter Logic for Workspace
    const filteredShowcaseItems = showcaseItems.filter(item => {
        if (filter === 'All') return true;
        if (filter === 'Draft') return item.status === 'Draft';
        if (filter === 'Active') return item.status === 'Active';
        if (filter === 'Display') return item.status === 'Display';
        return true;
    });

    if (loading) {
        return (
            <div className="min-h-screen pt-32 pb-12 px-4 sm:px-6 lg:px-8 bg-brand-dark">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
                        {[...Array(10)].map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!user && !loading) return null;

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col">
            <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-heading font-bold text-white">マイコレクション</h1>
                    <div className="flex gap-4">
                        <Link
                            href={`/profile/${user.id}`}
                            className="px-4 py-2 bg-brand-platinum/10 text-brand-platinum border border-brand-platinum/20 rounded-lg hover:bg-brand-platinum/20 transition-all font-bold text-sm flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            公開プロフィールを見る
                        </Link>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 bg-brand-gold/10 text-brand-gold border border-brand-gold/20 rounded-lg hover:bg-brand-gold/20 transition-all font-bold text-sm flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            カードを追加
                        </button>
                    </div>
                </div>

                <div className="glass-panel-premium shadow-2xl rounded-2xl border border-white/10">
                    <div className="border-b border-brand-platinum/10">
                        <nav className="-mb-px flex" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('showcase')}
                                className={`${activeTab === 'showcase'
                                    ? 'border-brand-blue text-brand-blue-glow'
                                    : 'border-transparent text-brand-platinum/60 hover:text-brand-platinum hover:border-brand-platinum/30'
                                    } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-all`}
                            >
                                ワークスペース
                            </button>
                            <button
                                onClick={() => setActiveTab('listings')}
                                className={`${activeTab === 'listings'
                                    ? 'border-brand-blue text-brand-blue-glow'
                                    : 'border-transparent text-brand-platinum/60 hover:text-brand-platinum hover:border-brand-platinum/30'
                                    } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-all relative`}
                            >
                                取引管理
                                {myListings.filter(i => {
                                    // @ts-ignore
                                    const o = i.orders ? (Array.isArray(i.orders) ? i.orders.find((o: any) => ['paid', 'awaiting_shipping'].includes((o.status || '').toLowerCase())) : i.orders) : null;
                                    return o && ['paid', 'awaiting_shipping'].includes((o.status || '').toLowerCase());
                                }).length > 0 && (
                                        <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
                                            {myListings.filter(i => {
                                                // @ts-ignore
                                                const o = i.orders ? (Array.isArray(i.orders) ? i.orders.find((o: any) => ['paid', 'awaiting_shipping'].includes((o.status || '').toLowerCase())) : i.orders) : null;
                                                return o && ['paid', 'awaiting_shipping'].includes((o.status || '').toLowerCase());
                                            }).length}
                                        </span>
                                    )}
                            </button>
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`${activeTab === 'orders'
                                    ? 'border-brand-blue text-brand-blue-glow'
                                    : 'border-transparent text-brand-platinum/60 hover:text-brand-platinum hover:border-brand-platinum/30'
                                    } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-all relative`}
                            >
                                購入中
                                {myOrders.filter(o => o.status === 'shipped').length > 0 && (
                                    <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-black bg-brand-gold rounded-full">
                                        {myOrders.filter(o => o.status === 'shipped').length}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setActiveTab('archive')}
                                className={`${activeTab === 'archive'
                                    ? 'border-brand-blue text-brand-blue-glow'
                                    : 'border-transparent text-brand-platinum/60 hover:text-brand-platinum hover:border-brand-platinum/30'
                                    } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-all`}
                            >
                                アーカイブ
                            </button>
                        </nav>
                    </div>

                    <div className="p-6 min-h-[400px]">
                        {activeTab === 'showcase' && (
                            <>
                                {/* Filter Pills */}
                                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                                    {['All', 'Draft', 'Active', 'Display'].map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f as any)}
                                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filter === f
                                                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                                                : 'bg-brand-dark-light border border-brand-platinum/10 text-brand-platinum/60 hover:bg-brand-platinum/10 hover:text-white'
                                                }`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
                                    {filteredShowcaseItems.map((item, idx) => (
                                        <ShowcaseCard
                                            key={idx}
                                            item={item}
                                            type={item.type as any} // Pass type 'listed' or 'purchased'
                                            onDelete={handleDeleteCollectionItem}
                                            onCancel={handleCancelListing}
                                            onToggleDisplay={handleToggleDisplay}
                                            is_live_moment={item.is_live_moment || isDebugLive}
                                            live_moments={item.live_moments} // New prop
                                            moment_created_at={item.moment_created_at}
                                        />
                                    ))}
                                    {filteredShowcaseItems.length === 0 && (
                                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-brand-platinum/50">
                                            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                            <p>「{filter}」にアイテムが見つかりません。</p>
                                            {filter === 'All' && (
                                                <button onClick={() => setIsModalOpen(true)} className="mt-4 text-brand-blue hover:text-brand-blue-glow">最初のカードを追加する</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === 'listings' && (
                            <div className="grid grid-cols-1 gap-4">
                                {myListings.length === 0 ? (
                                    <div className="text-center py-12 text-brand-platinum/50">
                                        <p>進行中の販売はありません。</p>
                                        <p className="text-sm mt-2">出品中のアイテムはワークスペースにあります。</p>
                                    </div>
                                ) : (
                                    myListings.map(item => {
                                        // Handle Supabase relation (Array vs Object) and multiple orders
                                        // @ts-ignore
                                        const order = item.orders ? (
                                            Array.isArray(item.orders)
                                                ? (item.orders.find((o: any) => !['completed', 'cancelled'].includes((o.status || '').toLowerCase())) || item.orders[0])
                                                : item.orders
                                        ) : null;

                                        return (
                                            <div key={item.id} className="flex gap-4 p-4 rounded-xl bg-brand-dark-light/30 border border-brand-platinum/5">
                                                <div className="w-20 h-20 rounded-lg overflow-hidden bg-brand-dark-light flex-shrink-0">
                                                    {item.images?.[0] ? (
                                                        <img src={item.images[0]} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-brand-platinum/20">
                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="text-white font-bold">{item.player_name || 'Unknown Item'}</h3>
                                                            <p className="text-brand-platinum/60 text-sm">
                                                                {order && ['paid', 'awaiting_shipping'].includes((order.status || '').toLowerCase()) ? '発送手続きをお願いします' :
                                                                    order && order.status === 'shipped' ? '配送中' :
                                                                        item.status === 'TransactionPending' ? '決済処理中' :
                                                                            item.status}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2 flex-shrink-0">
                                                            {order && (
                                                                ['paid', 'awaiting_shipping'].includes((order.status || '').toLowerCase()) ? (
                                                                    <Link
                                                                        href={`/orders/sell/${order.id}`}
                                                                        className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors shadow-lg text-white bg-red-500 hover:bg-red-400 shadow-red-500/30 animate-pulse"
                                                                    >
                                                                        📦 発送手続きへ
                                                                    </Link>
                                                                ) : order.status === 'shipped' ? (
                                                                    <Link
                                                                        href={`/orders/sell/${order.id}`}
                                                                        className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors shadow-lg text-brand-dark bg-brand-blue hover:bg-brand-blue-light shadow-brand-blue/20"
                                                                    >
                                                                        ✅ 発送完了
                                                                    </Link>
                                                                ) : (
                                                                    <Link
                                                                        href={`/orders/sell/${order.id}`}
                                                                        className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors shadow-lg text-brand-dark bg-brand-blue hover:bg-brand-blue-light shadow-brand-blue/20"
                                                                    >
                                                                        注文詳細
                                                                    </Link>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}

                        {activeTab === 'orders' && (
                            <div className="grid grid-cols-1 gap-4">
                                {myOrders.length === 0 ? (
                                    <div className="text-center py-12 text-brand-platinum/50">
                                        <p>進行中の購入はありません。</p>
                                    </div>
                                ) : (
                                    myOrders.map(order => (
                                        <div key={order.id} className="flex gap-4 p-4 rounded-xl bg-brand-dark-light/30 border border-brand-platinum/5">
                                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-brand-dark-light">
                                                {order.listing?.images?.[0] ? (
                                                    <img src={order.listing.images[0]} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-brand-platinum/20">
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-white font-bold">{order.listing?.player_name || 'Unknown Item'}</h3>
                                                        <p className="text-brand-platinum/60 text-sm">
                                                            {order.status === 'shipped' ? '配送中' :
                                                                order.status === 'completed' ? '受取完了' :
                                                                    order.status === 'delivered' ? '配達済み' :
                                                                        order.status === 'paid' || order.status === 'awaiting_shipping' ? '発送準備中' :
                                                                            order.status === 'pending' ? '決済処理中' :
                                                                                '購入済み'}
                                                        </p>
                                                    </div>
                                                    {['paid', 'awaiting_shipping', 'shipped', 'delivered'].includes(order.status?.toLowerCase()) ? (
                                                        <Link
                                                            href={`/orders/buy/${order.id}`}
                                                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors shadow-lg ${order.status === 'shipped'
                                                                ? 'text-brand-dark bg-brand-gold hover:bg-brand-gold-light shadow-brand-gold/20'
                                                                : 'text-brand-platinum/60 bg-brand-dark-light border border-brand-platinum/10'
                                                                }`}
                                                        >
                                                            {order.status === 'shipped' ? '確認・受取' : '注文を見る'}
                                                        </Link>
                                                    ) : (
                                                        <span
                                                            className="px-3 py-1 text-xs font-bold text-brand-platinum/40 bg-brand-dark-light border border-brand-platinum/10 rounded-lg cursor-not-allowed"
                                                        >
                                                            {order.status === 'pending' ? '決済処理中' : '発送準備中'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}


                        {activeTab === 'archive' && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
                                {archivedItems.map((item) => (
                                    <ShowcaseCard
                                        key={item.id}
                                        item={item}
                                        isArchived={true}
                                        onRestore={handleRestoreCollectionItem}
                                        onDelete={handleDeleteCollectionItem} // Optional: if physical delete ever needed
                                        is_live_moment={item.is_live_moment || isDebugLive}
                                        live_moments={item.live_moments} // New prop
                                        moment_created_at={item.moment_created_at}
                                    />
                                ))}
                                {archivedItems.length === 0 && (
                                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-brand-platinum/50">
                                        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                        <p>アーカイブは空です。</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <Footer />
                <AddToShowcaseModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onAdded={fetchData}
                />

                {
                    showAnimation && (
                        <PurchaseAnimation
                            onComplete={() => {
                                setShowAnimation(false);
                                fetchData();
                            }}
                        />
                    )
                }
            </div>
        </div>
    );
}

export default function MyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-brand-dark flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div></div>}>
            <MyPageContent />
        </Suspense>
    );
}
