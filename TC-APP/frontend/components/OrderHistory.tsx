'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSellerOrders, getBuyerOrders } from '../app/actions/order';

export default function OrderHistory({ mode }: { mode: 'buy' | 'sell' }) {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const data = mode === 'sell' ? await getSellerOrders() : await getBuyerOrders();
                setOrders(data);
            } catch (error) {
                console.error('Failed to fetch orders', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [mode]);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="p-8 text-center border border-white/5 rounded-2xl bg-white/5">
                <p className="text-brand-platinum/60">
                    {mode === 'sell' ? 'You have no sales yet.' : 'You have no purchases yet.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {orders.map((order) => (
                <Link
                    key={order.id}
                    href={`/orders/${mode}/${order.id}`}
                    className="block group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all p-4"
                >
                    <div className="flex gap-4 items-center">
                        {/* Image */}
                        <div className="w-16 h-20 bg-black/20 rounded-lg overflow-hidden flex-shrink-0">
                            {order.listing?.images?.[0] ? (
                                <img
                                    src={order.listing.images[0]}
                                    alt={order.listing.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">🃏</div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusStyle(order.status)}`}>
                                    {order.status.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-brand-platinum/60 font-mono">
                                    {new Date(order.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="font-bold text-white truncate text-sm mb-0.5">
                                {order.listing?.player_name || order.listing?.series_name || 'Unknown Item'}
                            </h3>
                            <p className="text-xs text-brand-platinum/60 truncate">
                                {order.listing?.title}
                            </p>
                            <div className="mt-2 text-brand-gold font-mono text-sm font-bold">
                                ¥{(order.total_amount || 0).toLocaleString()}
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="text-brand-platinum/20 group-hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}

function getStatusStyle(status: string) {
    switch (status) {
        case 'paid':
        case 'awaiting_shipping':
            return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case 'shipped':
            return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'completed':
            return 'bg-green-500/20 text-green-400 border-green-500/30';
        default:
            return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
}
