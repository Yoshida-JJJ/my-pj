'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Types
interface ListingItem {
    id: string;
    catalog_id: string;
    price: number;
    images: string[];
    status: string;
    catalog: {
        player_name: string;
        year: number;
        manufacturer: string;
        series_name?: string;
        team: string;
    };
}

interface OrderItem {
    id: string;
    listing_id: string;
    status: string;
    total_amount: number;
    tracking_number?: string;
    listing?: ListingItem;
}

export default function MyPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'listings' | 'orders'>('listings');

    const [myListings, setMyListings] = useState<ListingItem[]>([]);
    const [myOrders, setMyOrders] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        const fetchData = async () => {
            if (!session?.user?.id) return;

            setLoading(true);
            try {
                // Fetch My Listings
                const listingsRes = await fetch(`/api/proxy/market/listings?seller_id=${session.user.id}`);
                if (listingsRes.ok) {
                    const listingsData = await listingsRes.json();
                    setMyListings(listingsData);
                }

                // Fetch My Orders
                const ordersRes = await fetch(`/api/proxy/market/orders?buyer_id=${session.user.id}`);
                if (ordersRes.ok) {
                    const ordersData = await ordersRes.json();
                    setMyOrders(ordersData);
                }

            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (session?.user?.id) {
            fetchData();
        }
    }, [session]);

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-heading font-bold text-white mb-8">My Collection</h1>

                <div className="glass-panel-premium shadow-2xl overflow-hidden rounded-2xl border border-white/10">
                    <div className="border-b border-brand-platinum/10">
                        <nav className="-mb-px flex" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('listings')}
                                className={`${activeTab === 'listings'
                                    ? 'border-brand-blue text-brand-blue-glow'
                                    : 'border-transparent text-brand-platinum/60 hover:text-brand-platinum hover:border-brand-platinum/30'
                                    } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-all`}
                            >
                                My Listings
                            </button>
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`${activeTab === 'orders'
                                    ? 'border-brand-blue text-brand-blue-glow'
                                    : 'border-transparent text-brand-platinum/60 hover:text-brand-platinum hover:border-brand-platinum/30'
                                    } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-all`}
                            >
                                My Orders
                            </button>
                        </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'listings' ? (
                            <div>
                                <h2 className="text-lg font-medium text-white mb-4">Items you are selling</h2>
                                {myListings.length === 0 ? (
                                    <p className="text-brand-platinum/60">You haven't listed any items yet.</p>
                                ) : (
                                    <ul className="divide-y divide-brand-platinum/10">
                                        {myListings.map((item) => (
                                            <li key={item.id} className="py-4 flex group">
                                                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-brand-platinum/10 bg-brand-dark-light/50">
                                                    <img
                                                        src={item.images[0]}
                                                        alt={item.catalog.player_name}
                                                        className="h-full w-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                </div>
                                                <div className="ml-4 flex flex-1 flex-col">
                                                    <div>
                                                        <div className="flex justify-between text-base font-medium text-white">
                                                            <h3>
                                                                <Link href={`/listings/${item.id}`} className="hover:text-brand-blue-glow transition-colors">
                                                                    {item.catalog.player_name}
                                                                </Link>
                                                            </h3>
                                                            <p className="ml-4 font-bold text-brand-gold text-gold-glow">¥{item.price.toLocaleString()}</p>
                                                        </div>
                                                        <p className="mt-1 text-sm text-brand-platinum/60">{item.catalog.year} {item.catalog.manufacturer}</p>
                                                    </div>
                                                    <div className="flex flex-1 items-end justify-between text-sm">
                                                        <p className={`font-medium ${item.status === 'Active' ? 'text-green-400' : 'text-brand-platinum/60'
                                                            }`}>
                                                            Status: {item.status}
                                                        </p>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-lg font-medium text-white mb-4">Your Purchase History</h2>
                                {myOrders.length === 0 ? (
                                    <p className="text-brand-platinum/60">You haven't purchased any items yet.</p>
                                ) : (
                                    <ul className="divide-y divide-brand-platinum/10">
                                        {myOrders.map((order) => (
                                            <li key={order.id} className="py-4">
                                                <div className="flex gap-4">
                                                    {/* Image */}
                                                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-brand-platinum/10 bg-brand-dark-light/50">
                                                        {order.listing?.images?.[0] ? (
                                                            <img
                                                                src={order.listing.images[0]}
                                                                alt="Card"
                                                                className="h-full w-full object-cover object-center"
                                                            />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-brand-platinum/20">
                                                                No Image
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 flex flex-col justify-between">
                                                        <div className="flex justify-between">
                                                            <div>
                                                                <p className="text-sm font-medium text-white">Order ID: {order.id}</p>
                                                                {order.listing && (
                                                                    <p className="text-sm text-brand-platinum/80 mt-1">
                                                                        {order.listing.catalog.player_name}
                                                                    </p>
                                                                )}
                                                                <p className="text-sm text-brand-platinum/60 mt-1">Total: <span className="text-brand-platinum">¥{order.total_amount.toLocaleString()}</span></p>
                                                            </div>
                                                            <div>
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                                                    {order.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 flex justify-end">
                                                            <Link href={`/orders/${order.id}/success`} className="text-brand-blue hover:text-brand-blue-glow text-sm transition-colors">
                                                                View Details
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
