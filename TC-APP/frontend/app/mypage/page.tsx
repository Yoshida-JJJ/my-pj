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
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">My Page</h1>

                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('listings')}
                                className={`${activeTab === 'listings'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
                            >
                                My Listings
                            </button>
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`${activeTab === 'orders'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
                            >
                                My Orders
                            </button>
                        </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'listings' ? (
                            <div>
                                <h2 className="text-lg font-medium text-gray-900 mb-4">Items you are selling</h2>
                                {myListings.length === 0 ? (
                                    <p className="text-gray-500">You haven't listed any items yet.</p>
                                ) : (
                                    <ul className="divide-y divide-gray-200">
                                        {myListings.map((item) => (
                                            <li key={item.id} className="py-4 flex">
                                                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                                                    <img
                                                        src={item.images[0]}
                                                        alt={item.catalog.player_name}
                                                        className="h-full w-full object-cover object-center"
                                                    />
                                                </div>
                                                <div className="ml-4 flex flex-1 flex-col">
                                                    <div>
                                                        <div className="flex justify-between text-base font-medium text-gray-900">
                                                            <h3>
                                                                <Link href={`/listings/${item.id}`}>
                                                                    {item.catalog.player_name}
                                                                </Link>
                                                            </h3>
                                                            <p className="ml-4">¥{item.price.toLocaleString()}</p>
                                                        </div>
                                                        <p className="mt-1 text-sm text-gray-500">{item.catalog.year} {item.catalog.manufacturer}</p>
                                                    </div>
                                                    <div className="flex flex-1 items-end justify-between text-sm">
                                                        <p className={`font-medium ${item.status === 'Active' ? 'text-green-600' : 'text-gray-500'
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
                                <h2 className="text-lg font-medium text-gray-900 mb-4">Your Purchase History</h2>
                                {myOrders.length === 0 ? (
                                    <p className="text-gray-500">You haven't purchased any items yet.</p>
                                ) : (
                                    <ul className="divide-y divide-gray-200">
                                        {myOrders.map((order) => (
                                            <li key={order.id} className="py-4">
                                                <div className="flex justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">Order ID: {order.id}</p>
                                                        <p className="text-sm text-gray-500">Total: ¥{order.total_amount.toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <Link href={`/orders/${order.id}/success`} className="text-blue-600 hover:text-blue-500 text-sm">
                                                        View Details
                                                    </Link>
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
