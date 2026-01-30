'use client';

import { useEffect, useState, use } from 'react'; // React 19: use() for params
import { useRouter } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';
import { markAsShipped, getSellerOrderDetails } from '../../../actions/order';
import { SellerOrderDetail } from '../../../../types/index';



export default function SellerOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [order, setOrder] = useState<SellerOrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [trackingNumber, setTrackingNumber] = useState('');
    const [carrier, setCarrier] = useState('');

    useEffect(() => {
        const fetchOrder = async () => {
            // No need to check user here, Server Action checks it.
            // But we might need standard auth check for redirect? 
            // Better to let SA throw error.

            try {
                const data = await getSellerOrderDetails(id);
                setOrder(data as SellerOrderDetail);
                setLoading(false);
            } catch (error: any) {
                console.error('Fetch Order Error:', error);
                alert(error.message || 'Order not found');
                router.push('/collection');
            }
        };
        fetchOrder();
    }, [id, router]);

    const handleShip = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm('Mark as shipped? This will notify the buyer.')) return;

        setSubmitting(true);
        try {
            await markAsShipped(id, trackingNumber, carrier);
            alert('Order mark as shipped!');
            // Refresh
            window.location.reload();
        } catch (error: any) {
            alert(error.message || 'Failed to update status');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-brand-dark flex items-center justify-center text-white">Loading...</div>;
    if (!order) return null;

    // Resolve Shipping Address (Snapshot vs Legacy columns)
    const shippingInfo = order.shipping_address_snapshot || {
        name: order.shipping_name || 'Unknown',
        postal_code: order.shipping_postal_code || '',
        address: order.shipping_address || '',
        phone: order.shipping_phone || ''
    };

    return (
        <div className="min-h-screen bg-brand-dark text-white pt-24 pb-12 px-4">
            <div className="max-w-2xl mx-auto glass-panel-premium rounded-2xl p-8 border border-white/10">
                <h1 className="text-2xl font-bold font-heading mb-6 flex items-center justify-between">
                    <span>Manage Order</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider
                        ${order.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                order.status === 'awaiting_shipping' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                    'bg-gray-500/20 text-gray-400'}`}>
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
                        <p className="text-brand-gold font-mono mt-1">¥{(order.listing.price || 0).toLocaleString()}</p>
                    </div>
                </div>

                {/* Financial Summary */}
                <div className="mb-8 p-6 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <h3 className="text-sm font-bold text-brand-platinum/60 uppercase tracking-widest mb-2 font-heading">会計明細 (Financial Summary)</h3>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-brand-platinum/60">注文日時 (Ordered At)</span>
                            <span className="text-white font-mono">{new Date(order.created_at).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-brand-platinum/60">販売価格 (Sale Price)</span>
                            <span className="text-white font-bold">¥{(order.total_amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-brand-platinum/60">販売手数料 (Platform Fee 10%)</span>
                            <span className="text-red-400">-¥{Math.floor((order.total_amount || 0) * 0.1).toLocaleString()}</span>
                        </div>
                        <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                            <span className="text-brand-gold font-bold">振込予定金額 (Seller Net)</span>
                            <span className="text-brand-gold text-xl font-bold font-heading">¥{Math.floor((order.total_amount || 0) * 0.9).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-lg">
                        <p className="text-xs text-brand-blue leading-relaxed">
                            ※ <strong>配送料は出品者（販売者）負担</strong>となります。発送時に配送業者へお支払いください。
                        </p>
                    </div>
                </div>

                {/* Shipping Action Area */}
                {order.status === 'awaiting_shipping' || order.status === 'paid' ? (
                    <div className="mb-8">

                        {/* Privacy Warning Banner */}
                        <div className="bg-red-900/20 border border-red-600/50 rounded-xl p-4 mb-6 flex gap-4 items-start">
                            <div className="text-2xl">⚠️</div>
                            <div>
                                <h4 className="font-bold text-red-500 mb-1 text-sm uppercase tracking-wider">個人情報の取り扱いについて (Strictly Prohibited)</h4>
                                <p className="text-sm text-red-200/80 leading-relaxed">
                                    表示されている購入者の氏名・住所は、<span className="font-bold text-white">商品の発送目的以外での利用を固く禁じます。</span> SNSへの投稿や第三者への共有、取引終了後の利用は法律により罰せられる可能性があります。
                                </p>
                            </div>
                        </div>

                        <div className="bg-brand-blue/10 border border-brand-blue/20 p-6 rounded-xl mb-6">
                            <h3 className="text-brand-blue font-bold mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                Shipping Address
                            </h3>
                            <div className="text-sm space-y-1">
                                <p className="font-bold text-lg">{shippingInfo.name}</p>
                                <p>〒{shippingInfo.postal_code}</p>
                                <p>{shippingInfo.address}</p>
                                <p className="text-brand-platinum/60 mt-2">Phone: {shippingInfo.phone}</p>
                            </div>

                        </div>

                        <form onSubmit={handleShip} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-platinum mb-1">Carrier (Optional)</label>
                                <input
                                    type="text"
                                    value={carrier}
                                    onChange={(e) => setCarrier(e.target.value)}
                                    placeholder="e.g. Yamato, Japan Post"
                                    className="w-full bg-brand-dark-light border border-brand-platinum/20 rounded-lg px-4 py-3 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-platinum mb-1">Tracking Number (Optional)</label>
                                <input
                                    type="text"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="e.g. 1234-5678-9012"
                                    className="w-full bg-brand-dark-light border border-brand-platinum/20 rounded-lg px-4 py-3 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-brand-gold text-brand-dark font-bold py-4 rounded-xl hover:bg-brand-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                {submitting ? 'Processing...' : 'Notify Shipment'}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-400 mb-4">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Item Shipped</h3>
                        {order.shipped_at && <p className="text-sm text-brand-platinum/60 mb-4">Shipped on {new Date(order.shipped_at).toLocaleDateString()}</p>}

                        {(order.carrier || order.tracking_number) && (
                            <div className="text-left bg-black/20 p-4 rounded-lg inline-block w-full text-sm">
                                {order.carrier && <p><span className="text-brand-platinum/60">Carrier:</span> {order.carrier}</p>}
                                {order.tracking_number && <p><span className="text-brand-platinum/60">Tracking:</span> {order.tracking_number}</p>}
                            </div>
                        )}
                    </div>
                )}

                <button onClick={() => router.back()} className="text-brand-platinum hover:text-white transition-colors text-sm">
                    &larr; Back to Collection
                </button>
            </div>
        </div>
    );
}
