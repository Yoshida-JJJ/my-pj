import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface ShowcaseItemProps {
    item: {
        id: string;
        type?: 'listed' | 'purchased'; // To distinguish in aggregated view
        catalog_id: string;
        price: number | null;
        images: string[];
        status: string;
        catalog: {
            player_name: string;
            year: number;
            manufacturer: string;
            series_name?: string;
            team: string;
        };
    };
    variant?: 'default' | 'live-moment';
    is_live_moment?: boolean; // Added flag
    onDelete?: (id: string) => void;
    onCancel?: (id: string) => void;
    onToggleDisplay?: (id: string, currentStatus: string) => void;
}

export default function ShowcaseCard({ item, variant = 'default', is_live_moment, onDelete, onCancel, onToggleDisplay }: ShowcaseItemProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const hasBackImage = item.images && item.images.length > 1;
    // Use prop if provided, otherwise fallback to variant (for backward compatibility or explicit override)
    const isLiveMoment = is_live_moment || variant === 'live-moment';

    const handleFlip = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsFlipped(!isFlipped);
    };

    return (
        <motion.div
            className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all duration-500 bg-brand-dark-light/50`}
            animate={isLiveMoment ? {
                boxShadow: [
                    "0 0 15px rgba(255, 215, 0, 0.2)",
                    "0 0 30px rgba(255, 215, 0, 0.5)",
                    "0 0 15px rgba(255, 215, 0, 0.2)"
                ],
                borderColor: [
                    "rgba(255, 215, 0, 0.4)",
                    "rgba(255, 215, 0, 1)",
                    "rgba(255, 215, 0, 0.4)"
                ]
            } : {}}
            transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
            }}
            whileHover={{ scale: 1.02 }}
            style={{
                borderColor: isLiveMoment ? '#FFD700' : 'rgba(255, 255, 255, 0.1)'
            }}
        >

            {/* Live Moment Badge */}
            {isLiveMoment && (
                <div className="absolute top-0 left-0 z-30 w-full overflow-hidden h-full pointer-events-none">
                    <div className="absolute top-3 left-3 px-2 py-0.5 bg-brand-gold text-brand-dark text-[10px] font-bold tracking-wider rounded shadow-lg shadow-brand-gold/20 border border-white/20 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                        LIVE
                    </div>
                    {/* Corner Glow Effect */}
                    <div className="absolute -top-10 -left-10 w-20 h-20 bg-brand-gold/30 blur-2xl rounded-full"></div>
                    <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-brand-gold/30 blur-2xl rounded-full"></div>
                </div>
            )}
            {/* Card Image Area */}
            <div className="relative aspect-[3/4] w-full perspective-[1000px]">
                <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped && hasBackImage ? '[transform:rotateY(180deg)]' : ''}`}>
                    {/* Front Image */}
                    <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
                        {item.images && item.images[0] ? (
                            <Image
                                src={item.images[0]}
                                alt={item.catalog?.player_name}
                                fill
                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-brand-platinum/20">No Image</div>
                        )}
                        {/* Live Moment Inner Glow */}
                        {isLiveMoment && (
                            <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(255,215,0,0.3)] mix-blend-overlay pointer-events-none" />
                        )}
                    </div>

                    {/* Back Image */}
                    {hasBackImage && (
                        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-brand-dark-light relative">
                            <Image
                                src={item.images[1]}
                                alt={`${item.catalog?.player_name} Back`}
                                fill
                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                                className="object-cover"
                            />

                            {/* Live Moment Stats Overlay */}
                            {isLiveMoment && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center p-4 text-center">
                                    <div className="border-2 border-brand-gold/50 p-3 rounded-lg bg-black/40 backdrop-blur-sm w-full">
                                        <h4 className="text-brand-gold font-heading font-bold text-lg mb-2 tracking-widest border-b border-brand-gold/30 pb-1">MOMENT DATA</h4>
                                        <div className="space-y-2 text-xs font-mono">
                                            <div className="flex justify-between">
                                                <span className="text-brand-platinum/60">DATE</span>
                                                <span className="text-white font-bold">2024.10.01</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-brand-platinum/60">LOC</span>
                                                <span className="text-white font-bold">Tokyo Dome</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-brand-platinum/60">OPP</span>
                                                <span className="text-white font-bold">vs Giants</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-brand-platinum/60">RESULT</span>
                                                <span className="text-white font-bold">4-3 W</span>
                                            </div>
                                            <div className="pt-2 border-t border-brand-platinum/10">
                                                <div className="text-brand-gold font-bold mb-1">WALK-OFF HOME RUN</div>
                                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                    <div className="bg-brand-platinum/10 rounded p-1">
                                                        <div className="text-brand-platinum/50">EXIT VELO</div>
                                                        <div className="text-white font-bold">110 mph</div>
                                                    </div>
                                                    <div className="bg-brand-platinum/10 rounded p-1">
                                                        <div className="text-brand-platinum/50">DISTANCE</div>
                                                        <div className="text-white font-bold">450 ft</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Flip Button */}
                {hasBackImage && (
                    <button
                        onClick={handleFlip}
                        className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-black/60 text-white hover:bg-brand-blue hover:text-white transition-colors backdrop-blur-sm border border-white/10"
                        title="Flip Card"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Footer Area: Info & Actions */}
            <div className="p-3 bg-brand-dark-light border-t border-brand-platinum/5 flex flex-col gap-2">
                {/* Info */}
                <div>
                    <p className="text-white font-bold text-sm truncate" title={item.catalog?.player_name}>{item.catalog?.player_name}</p>
                    <p className="text-brand-platinum/70 text-xs truncate">{item.catalog?.year} {item.catalog?.manufacturer}</p>
                </div>

                {/* Status & Price */}
                <div className="flex justify-between items-center">
                    {item.type === 'purchased' ? (
                        <span className="text-[10px] px-2 py-1 rounded-full border bg-green-500/20 border-green-500 text-green-300">
                            PURCHASED
                        </span>
                    ) : (
                        <>
                            {item.status === 'Active' ? (
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-brand-gold flex items-center justify-center shadow-[0_0_5px_rgba(234,179,8,0.5)]">
                                        <span className="text-[8px] text-brand-dark font-bold">¥</span>
                                    </div>
                                    <span className="font-heading font-bold text-white text-sm">
                                        {item.price?.toLocaleString() ?? '---'}
                                    </span>
                                </div>
                            ) : (
                                <span className={`text-[10px] px-2 py-1 rounded-full border ${item.status === 'Sold' || item.status === 'Completed' || item.status === 'Delivered' ? 'bg-red-500/20 border-red-500 text-red-300' :
                                    item.status === 'Display' ? 'bg-brand-platinum/20 border-brand-platinum/30 text-white' :
                                        'bg-gray-500/20 border-gray-500 text-gray-300'
                                    } `}>
                                    {item.status === 'Sold' || item.status === 'Completed' || item.status === 'Delivered' ? 'SOLD' :
                                        item.status === 'Display' ? 'DISPLAY ONLY' :
                                            item.status.toUpperCase()}
                                </span>
                            )}
                        </>
                    )}
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center gap-2 pt-2 border-t border-brand-platinum/5">
                    {/* Toggle Display Status Button */}
                    {(item.status === 'Draft' || item.status === 'Display' || item.status === 'Active') && onToggleDisplay && (
                        <div className="group/tooltip relative">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onToggleDisplay(item.id, item.status);
                                }}
                                className={`p-1.5 rounded-md border transition-all ${item.status === 'Display'
                                    ? 'bg-brand-blue/20 border-brand-blue text-brand-blue hover:bg-brand-blue/30'
                                    : 'bg-brand-platinum/10 border-brand-platinum/20 text-brand-platinum/60 hover:bg-brand-platinum/20 hover:text-white'
                                    } `}
                            >
                                {item.status === 'Display' ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                )}
                            </button>
                            <div className="absolute left-0 bottom-full mb-2 px-2 py-1 bg-black/90 border border-white/10 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200 z-50">
                                {item.status === 'Display' ? "公開中 (クリックで下書きに戻す)" :
                                    item.status === 'Active' ? "出品中 (クリックでDisplayに変更)" :
                                        "下書き (クリックでShowcaseに公開)"}
                            </div>
                        </div>
                    )}

                    {/* List Button (For Draft/Display) */}
                    {(item.status === 'Draft' || item.status === 'Display') && (
                        <Link
                            href={`/sell?source=collection&id=${item.id}`}
                            className="group/tooltip relative p-1.5 bg-brand-blue/20 hover:bg-brand-blue/40 text-brand-blue rounded-md border border-brand-blue/30 transition-colors ml-auto"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div className="absolute right-0 bottom-full mb-2 px-2 py-1 bg-black/90 border border-white/10 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200 z-50">
                                出品する
                            </div>
                        </Link>
                    )}

                    {/* Cancel Listing Button (for Active items) */}
                    {item.status === 'Active' && onCancel && (
                        <div className="group/tooltip relative ml-auto">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onCancel(item.id);
                                }}
                                className="p-1.5 bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 rounded-md border border-orange-500/30 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <div className="absolute right-0 bottom-full mb-2 px-2 py-1 bg-black/90 border border-white/10 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200 z-50">
                                出品を取り消す
                            </div>
                        </div>
                    )}

                    {/* Delete Button */}
                    {onDelete && (
                        <div className="group/tooltip relative">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onDelete(item.id);
                                }}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-md border border-red-500/20 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                            <div className="absolute right-0 bottom-full mb-2 px-2 py-1 bg-black/90 border border-white/10 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200 z-50">
                                コレクションから削除
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
