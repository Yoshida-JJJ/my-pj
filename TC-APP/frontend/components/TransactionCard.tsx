'use client';

import Link from 'next/link';

interface TransactionCardProps {
    order: {
        id: string;
        status: string;
        total_amount: number;
        fee_rate?: number;
        platform_fee?: number;
        net_earnings?: number;
        created_at: string;
        completed_at?: string;
        seller?: {
            display_name?: string;
        };
        listing?: {
            id?: string;
            player_name?: string;
            images?: string[];
            series_name?: string;
            title?: string;
            manufacturer?: string;
            year?: number;
        };
    };
    role: 'seller' | 'buyer';
    showFeeBreakdown?: boolean;
    showStatusBadge?: boolean;
    showLink?: boolean;
    showSeriesInfo?: boolean;
    showSellerName?: boolean;
    variant?: 'compact' | 'full';
}

export default function TransactionCard({
    order,
    role,
    showFeeBreakdown = false,
    showStatusBadge = false,
    showLink = false,
    showSeriesInfo = false,
    showSellerName = false,
    variant = 'compact',
}: TransactionCardProps) {
    const listing = order.listing;
    const image = listing?.images?.[0];
    const playerName = listing?.player_name || '不明なアイテム';
    const seriesLabel = [listing?.series_name, listing?.year].filter(Boolean).join(' ');
    const sellerName = order.seller?.display_name;

    const dateStr = order.completed_at || order.created_at;
    const displayDate = new Date(dateStr).toLocaleDateString('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit'
    });

    const saleAmount = order.total_amount;
    const feeRate = order.fee_rate;
    const platformFee = order.platform_fee || 0;
    const netEarning = order.net_earnings || 0;
    const feePercent = feeRate != null ? `${Math.round(feeRate * 100)}%` : '';

    const content = (
        <div className={`flex gap-4 p-4 rounded-xl bg-brand-dark-light/30 border border-brand-platinum/5 hover:border-brand-platinum/10 transition-all ${showLink ? 'cursor-pointer group' : ''}`}>
            {/* サムネイル */}
            <div className={`${variant === 'compact' ? 'w-16 h-16' : 'w-20 h-20'} rounded-lg overflow-hidden bg-brand-dark-light flex-shrink-0`}>
                {image ? (
                    <img src={image} className="w-full h-full object-cover" alt={playerName} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand-platinum/20">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
            </div>

            {/* 詳細 */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <div className="min-w-0">
                        {showStatusBadge && (
                            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mb-1 ${getStatusStyle(order.status)}`}>
                                {getStatusLabel(order.status)}
                            </span>
                        )}

                        <h3 className="text-white font-bold text-sm truncate">{playerName}</h3>

                        {showSeriesInfo && seriesLabel && (
                            <p className="text-brand-platinum/50 text-xs truncate">{seriesLabel}</p>
                        )}

                        <p className="text-brand-platinum/40 text-xs mt-0.5">{displayDate}</p>

                        {showSellerName && sellerName && (
                            <p className="text-brand-platinum/50 text-xs mt-0.5 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                {sellerName}
                            </p>
                        )}
                    </div>

                    {/* 金額エリア */}
                    <div className="text-right flex-shrink-0 ml-4">
                        {showFeeBreakdown && role === 'seller' ? (
                            <div className="space-y-0.5">
                                <p className="text-brand-platinum/50 text-xs">¥{saleAmount.toLocaleString()}</p>
                                <p className="text-red-400/70 text-[10px]">-¥{platformFee.toLocaleString()} ({feePercent})</p>
                                <p className="text-brand-gold font-bold text-sm">¥{netEarning.toLocaleString()}</p>
                            </div>
                        ) : (
                            <p className="text-brand-gold font-bold">¥{saleAmount.toLocaleString()}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* リンクアイコン */}
            {showLink && (
                <div className="text-brand-platinum/20 group-hover:text-white flex items-center flex-shrink-0 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            )}
        </div>
    );

    if (showLink) {
        const href = role === 'seller' ? `/orders/sell/${order.id}` : `/orders/buy/${order.id}`;
        return <Link href={href} className="block">{content}</Link>;
    }

    return content;
}

function getStatusStyle(status: string): string {
    switch (status) {
        case 'paid':
        case 'awaiting_shipping':
            return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case 'shipped':
            return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'completed':
            return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'pending':
            return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        default:
            return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
}

function getStatusLabel(status: string): string {
    switch (status) {
        case 'pending': return '保留中';
        case 'paid':
        case 'awaiting_shipping': return '発送待ち';
        case 'shipped': return '配送中';
        case 'completed': return '完了';
        case 'cancelled': return 'キャンセル';
        default: return status;
    }
}
