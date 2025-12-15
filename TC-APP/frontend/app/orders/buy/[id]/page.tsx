'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';
import { markAsReceived, getBuyerOrderDetails } from '../../../actions/order';

interface OrderDetail {
    id: string;
    status: string;
    listing: {
        title: string;
        player_name: string;
        images: string[];
        price: number;
        seller_id: string;
    };
    created_at: string;
    tracking_number?: string;
    carrier?: string;
    shipped_at?: string;
    completed_at?: string;
}

export default function BuyerOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const data = await getBuyerOrderDetails(id);
                setOrder(data as any);
                setLoading(false);
            } catch (error: any) {
                console.error('Fetch Order Error:', error);
                alert(error.message || 'Order not found');
                router.push('/collection');
            }
        };
        fetchOrder();
    }, [id, router]);

    const handleReceive = async () => {
        if (!confirm('Have you received the item? This will complete the transaction and release funds to the seller.')) return;

        setSubmitting(true);
        try {
            await markAsReceived(id);
            alert('Transaction Completed!');
            window.location.reload();
        } catch (error: any) {
            alert(error.message || 'Failed to update status');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-brand-dark flex items-center justify-center text-white">Loading...</div>;
    if (!order) return null;

    return (
        <div className="min-h-screen bg-brand-dark text-white pt-24 pb-12 px-4">
            <div className="max-w-2xl mx-auto glass-panel-premium rounded-2xl p-8 border border-white/10">
                <h1 className="text-2xl font-bold font-heading mb-6 flex items-center justify-between">
                    <span>Order Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider
                        ${order.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                        {order.status.replace('_', ' ')}
                    </span>
                </h1>

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
                            Shipment Details
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-brand-platinum/60 uppercase">Carrier</p>
                                <p className="font-bold text-lg">{order.carrier || 'Not specified'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-brand-platinum/60 uppercase">Tracking Number</p>
                                <p className="font-mono text-lg tracking-wider">{order.tracking_number || 'No tracking number'}</p>
                            </div>
                        </div>
                        {order.shipped_at && (
                            <p className="text-xs text-brand-platinum/40 mt-4 text-right">Shipped: {new Date(order.shipped_at).toLocaleString()}</p>
                        )}
                    </div>
                )}

                {/* Action Area */}
                {order.status === 'shipped' ? (
                    <div className="mb-8">
                        <div className="p-4 bg-brand-gold/10 border border-brand-gold/20 rounded-lg text-brand-gold mb-4 text-sm">
                            Please confirm receiving the item only after verifying its condition. This action is irreversible.
                        </div>
                        <button
                            onClick={handleReceive}
                            disabled={submitting}
                            className="w-full bg-brand-gold text-brand-dark font-bold py-4 rounded-xl hover:bg-brand-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-gold/20"
                        >
                            {submitting ? 'Processing...' : 'I Received the Item (Complete Transaction)'}
                        </button>
                    </div>
                ) : order.status === 'completed' ? (
                    <div className="mb-8 p-6 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                        <h3 className="text-green-400 font-bold text-xl mb-2">Transaction Completed</h3>
                        <p className="text-brand-platinum/60 text-sm">Thank you for your purchase.</p>
                    </div>
                ) : (
                    <div className="mb-8 p-6 bg-white/5 border border-white/10 rounded-xl text-center text-brand-platinum/60">
                        Waiting for seller to ship...
                    </div>
                )}

                <button onClick={() => router.back()} className="text-brand-platinum hover:text-white transition-colors text-sm">
                    &larr; Back to Collection
                </button>
            </div>
        </div>
    );
}
