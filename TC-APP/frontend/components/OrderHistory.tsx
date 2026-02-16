'use client';

import { useEffect, useState } from 'react';
import { getCompletedSales, getCompletedPurchases } from '../app/actions/order';
import TransactionCard from './TransactionCard';

export default function OrderHistory({ mode }: { mode: 'buy' | 'sell' }) {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const data = mode === 'sell' ? await getCompletedSales() : await getCompletedPurchases();
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
                    {mode === 'sell' ? '販売履歴はまだありません。' : '購入履歴はまだありません。'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {orders.map((order) => (
                <TransactionCard
                    key={order.id}
                    order={order}
                    role={mode === 'sell' ? 'seller' : 'buyer'}
                    showStatusBadge
                    showLink
                    showSeriesInfo
                    showFeeBreakdown={mode === 'sell'}
                    showSellerName={mode === 'buy'}
                    variant="full"
                />
            ))}
        </div>
    );
}
