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

// Types
interface ListingItem {
    id: string;
    catalog_id: string;
    price: number;
    images: string[];
    status: string;
    is_live_moment?: boolean; // Added flag

    // Decoupled fields
    player_name?: string | null;
    team?: string | null;
    year?: number | null;
    manufacturer?: string | null;
    series_name?: string | null;
    card_number?: string | null;
}

interface OrderItem {
    id: string;
    listing_id: string;
    status: string;
    total_amount: number;
    tracking_number?: string;
    listing?: ListingItem;
}

function MyPageContent() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const isDebugLive = searchParams.get('live') === 'true'; // Debug Mode

    const [activeTab, setActiveTab] = useState<'showcase' | 'listings' | 'orders' | 'history'>('showcase');
    const [historyTab, setHistoryTab] = useState<'sold' | 'purchased'>('sold');
    const [filter, setFilter] = useState<'All' | 'Draft' | 'Active' | 'Display' | 'Sold'>('All');
    const [showcaseItems, setShowcaseItems] = useState<any[]>([]);
    const [myListings, setMyListings] = useState<ListingItem[]>([]);
    const [myOrders, setMyOrders] = useState<OrderItem[]>([]);
    const [historySold, setHistorySold] = useState<ListingItem[]>([]);
    const [historyPurchased, setHistoryPurchased] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showAnimation, setShowAnimation] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }
        setUser(user);

        try {
            // Fetch All My Items (Listings + Collection)
            const { data: listingsData } = await supabase
                .from('listing_items')
                .select('*')
                .eq('seller_id', user.id);

            // Selling Tab: Active Transactions only
            const activeMyListings = listingsData?.filter(item =>
                ['TransactionPending', 'AwaitingShipment', 'Shipped', 'Delivered'].includes(item.status)
            ) || [];
            setMyListings(activeMyListings as any);

            // History: Sold Items
            const soldHistory = listingsData?.filter(item =>
                item.status === 'Completed'
            ) || [];
            setHistorySold(soldHistory as any);

            // Buying Tab: Active Transactions only
            const { data: ordersData } = await supabase
                .from('orders')
                .select('*, listing:listing_items(*)')
                .eq('buyer_id', user.id);

            const activeMyOrders = ordersData?.filter(order =>
                ['TransactionPending', 'AwaitingShipment', 'Shipped', 'Delivered'].includes(order.listing?.status || '')
            ) || [];
            setMyOrders(activeMyOrders as any || []);

            // History: Purchased Items
            const purchasedHistory = ordersData?.filter(order =>
                order.listing?.status === 'Completed'
            ) || [];
            setHistoryPurchased(purchasedHistory as any);

            // Workspace Tab: Aggregated View
            const workspaceListings = listingsData?.filter(item =>
                ['Active', 'Sold', 'Display', 'Shipped', 'Delivered', 'Draft'].includes(item.status)
            ) || [];

            const workspaceOrders = ordersData?.filter(order =>
                order.listing?.status === 'Delivered'
            ) || [];

            const aggregated = [
                ...workspaceListings.map(item => ({ type: 'listed', ...item })),
                ...workspaceOrders.map(order => ({ type: 'purchased', ...order.listing }))
            ];
            setShowcaseItems(aggregated);

        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReceiveOrder = async (listingId: string) => {
        if (!confirm('Have you received this item? This will complete the transaction.')) return;

        const supabase = createClient();

        // Use RPC function to bypass RLS for buyer update
        const { error } = await supabase.rpc('complete_order', {
            p_listing_id: listingId
        });

        if (error) {
            console.error('Failed to complete order:', error);
            alert('Failed to complete order: ' + error.message);
        } else {
            // Trigger animation
            setShowAnimation(true);
        }
    };

    const handleDeleteCollectionItem = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item from your showcase?')) return;

        const supabase = createClient();
        const { error } = await supabase
            .from('listing_items')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Failed to delete item:', error);
            alert('Failed to delete item');
        } else {
            fetchData();
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
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            console.error('Failed to update status:', error);
            alert('Failed to update status');
        } else {
            fetchData();
        }
    };

    const handleCancelListing = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this listing? The item will be returned to your drafts.')) return;

        const supabase = createClient();

        try {
            // Mark listing as Draft (Soft Delete from Marketplace, but keeps in DB)
            const { error: updateError } = await supabase
                .from('listing_items')
                .update({ status: 'Draft' })
                .eq('id', id);

            if (updateError) throw updateError;

            fetchData();

        } catch (error) {
            console.error('Failed to cancel listing:', error);
            alert('Failed to cancel listing');
        }
    };

    const handleShipItem = async (listingId: string) => {
        if (!confirm('Are you ready to ship this item?')) return;

        const supabase = createClient();
        const { error } = await supabase
            .from('listing_items')
            .update({ status: 'Shipped' })
            .eq('id', listingId);

        if (error) {
            console.error('Failed to ship item:', error);
            alert('Failed to ship item');
        } else {
            fetchData();
        }
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
        if (filter === 'Sold') return ['Sold', 'Shipped', 'Delivered', 'Completed'].includes(item.status); // Include all post-sale statuses
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
                    <h1 className="text-3xl font-heading font-bold text-white">My Collection</h1>
                    <div className="flex gap-4">
                        <Link
                            href={`/profile/${user.id}`}
                            className="px-4 py-2 bg-brand-platinum/10 text-brand-platinum border border-brand-platinum/20 rounded-lg hover:bg-brand-platinum/20 transition-all font-bold text-sm flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            View Public Profile
                        </Link>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 bg-brand-gold/10 text-brand-gold border border-brand-gold/20 rounded-lg hover:bg-brand-gold/20 transition-all font-bold text-sm flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add Card
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
                                Workspace
                            </button>
                            <button
                                onClick={() => setActiveTab('listings')}
                                className={`${activeTab === 'listings'
                                    ? 'border-brand-blue text-brand-blue-glow'
                                    : 'border-transparent text-brand-platinum/60 hover:text-brand-platinum hover:border-brand-platinum/30'
                                    } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-all`}
                            >
                                Selling
                            </button>
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`${activeTab === 'orders'
                                    ? 'border-brand-blue text-brand-blue-glow'
                                    : 'border-transparent text-brand-platinum/60 hover:text-brand-platinum hover:border-brand-platinum/30'
                                    } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-all`}
                            >
                                Buying
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`${activeTab === 'history'
                                    ? 'border-brand-blue text-brand-blue-glow'
                                    : 'border-transparent text-brand-platinum/60 hover:text-brand-platinum hover:border-brand-platinum/30'
                                    } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-all`}
                            >
                                History
                            </button>
                        </nav>
                    </div>

                    <div className="p-6 min-h-[400px]">
                        {activeTab === 'showcase' && (
                            <>
                                {/* Filter Pills */}
                                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                                    {['All', 'Draft', 'Active', 'Display', 'Sold'].map((f) => (
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
                                            onDelete={handleDeleteCollectionItem}
                                            onCancel={handleCancelListing}
                                            onToggleDisplay={handleToggleDisplay}
                                            is_live_moment={item.is_live_moment || isDebugLive}
                                        />
                                    ))}
                                    {filteredShowcaseItems.length === 0 && (
                                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-brand-platinum/50">
                                            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                            <p>No items found in {filter}.</p>
                                            {filter === 'All' && (
                                                <button onClick={() => setIsModalOpen(true)} className="mt-4 text-brand-blue hover:text-brand-blue-glow">Add your first card</button>
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
                                        <p>No active sales in progress.</p>
                                        <p className="text-sm mt-2">Items listed for sale are in your Workspace.</p>
                                    </div>
                                ) : (
                                    myListings.map(item => (
                                        <div key={item.id} className="flex gap-4 p-4 rounded-xl bg-brand-dark-light/30 border border-brand-platinum/5">
                                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-brand-dark-light">
                                                <img src={item.images[0]} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-white font-bold">{item.player_name || 'Unknown Item'}</h3>
                                                        <p className="text-brand-platinum/60 text-sm">{item.status}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {(item.status === 'AwaitingShipment' || item.status === 'TransactionPending') && (
                                                            <button
                                                                onClick={() => handleShipItem(item.id)}
                                                                className="px-3 py-1 text-xs font-bold text-brand-dark bg-brand-blue hover:bg-brand-blue-light rounded-lg transition-colors shadow-lg shadow-brand-blue/20"
                                                            >
                                                                Ship Item
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'orders' && (
                            <div className="grid grid-cols-1 gap-4">
                                {myOrders.length === 0 ? (
                                    <div className="text-center py-12 text-brand-platinum/50">
                                        <p>No active purchases in progress.</p>
                                    </div>
                                ) : (
                                    myOrders.map(order => (
                                        <div key={order.id} className="flex gap-4 p-4 rounded-xl bg-brand-dark-light/30 border border-brand-platinum/5">
                                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-brand-dark-light">
                                                <img src={order.listing?.images[0]} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-white font-bold">{order.listing?.player_name || 'Unknown Item'}</h3>
                                                        <p className="text-brand-platinum/60 text-sm">
                                                            {order.listing?.status === 'Shipped' ? 'Shipped - On the way' :
                                                                order.listing?.status === 'Completed' ? 'Delivered & Completed' :
                                                                    order.listing?.status === 'AwaitingShipment' ? 'Awaiting Shipment' :
                                                                        order.listing?.status === 'TransactionPending' ? 'Transaction Pending' :
                                                                            'Purchased'}
                                                        </p>
                                                    </div>
                                                    {order.listing?.status === 'Shipped' ? (
                                                        <button
                                                            onClick={() => handleReceiveOrder(order.listing!.id)}
                                                            className="px-3 py-1 text-xs font-bold text-brand-dark bg-brand-gold hover:bg-brand-gold-light rounded-lg transition-colors shadow-lg shadow-brand-gold/20"
                                                        >
                                                            Order Received
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled
                                                            className="px-3 py-1 text-xs font-bold text-brand-platinum/40 bg-brand-dark-light border border-brand-platinum/10 rounded-lg cursor-not-allowed"
                                                        >
                                                            Waiting for Shipment
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div>
                                <div className="flex gap-4 mb-6 border-b border-brand-platinum/10 pb-4">
                                    <button
                                        onClick={() => setHistoryTab('sold')}
                                        className={`text-sm font-bold transition-colors ${historyTab === 'sold' ? 'text-brand-blue' : 'text-brand-platinum/60 hover:text-brand-platinum'
                                            }`}
                                    >
                                        Sold History
                                    </button>
                                    <button
                                        onClick={() => setHistoryTab('purchased')}
                                        className={`text-sm font-bold transition-colors ${historyTab === 'purchased' ? 'text-brand-blue' : 'text-brand-platinum/60 hover:text-brand-platinum'
                                            }`}
                                    >
                                        Purchase History
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {historyTab === 'sold' ? (
                                        historySold.length === 0 ? (
                                            <div className="text-center py-12 text-brand-platinum/50">
                                                <p>No sold items history.</p>
                                            </div>
                                        ) : (
                                            historySold.map(item => (
                                                <div key={item.id} className="flex gap-4 p-4 rounded-xl bg-brand-dark-light/30 border border-brand-platinum/5 opacity-75">
                                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-brand-dark-light grayscale">
                                                        <img src={item.images[0]} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <h3 className="text-white font-bold">{item.player_name || 'Unknown Item'}</h3>
                                                                <p className="text-brand-platinum/60 text-sm">Sold - Completed</p>
                                                            </div>
                                                            <div className="text-brand-gold font-bold">
                                                                ¥{item.price?.toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )
                                    ) : (
                                        historyPurchased.length === 0 ? (
                                            <div className="text-center py-12 text-brand-platinum/50">
                                                <p>No purchase history.</p>
                                            </div>
                                        ) : (
                                            historyPurchased.map(order => (
                                                <div key={order.id} className="flex gap-4 p-4 rounded-xl bg-brand-dark-light/30 border border-brand-platinum/5 opacity-75">
                                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-brand-dark-light grayscale">
                                                        <img src={order.listing?.images[0]} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <h3 className="text-white font-bold">{order.listing?.player_name || 'Unknown Item'}</h3>
                                                                <p className="text-brand-platinum/60 text-sm">Purchased - Completed</p>
                                                            </div>
                                                            <div className="text-brand-gold font-bold">
                                                                ¥{order.listing?.price?.toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )
                                    )}
                                </div>
                            </div>
                        )}
                    </div >
                </div >
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
