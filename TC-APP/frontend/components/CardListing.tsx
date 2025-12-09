import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react'; // Added useEffect
import { motion } from 'framer-motion';
import { ListingItem } from '../types';

interface ListingItemProps {
    item: ListingItem;
    isLiveMoment?: boolean; // Debug/Live prop
}

export default function CardListing({ item, isLiveMoment = false }: ListingItemProps) {
    const isSold = item.status !== 'Active';
    const [isFlipped, setIsFlipped] = useState(false);
    const hasBackImage = item.images && item.images.length > 1;

    // Countdown Logic
    const [timeLeft, setTimeLeft] = useState<string>('60:00');
    useEffect(() => {
        if (isLiveMoment) {
            const endTime = new Date().getTime() + 60 * 60 * 1000;
            const timer = setInterval(() => {
                const now = new Date().getTime();
                const distance = endTime - now;
                if (distance > 0) {
                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                    setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
                } else {
                    setTimeLeft('00:00');
                    clearInterval(timer);
                }
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isLiveMoment]);

    const handleFlip = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsFlipped(!isFlipped);
    };

    const Content = () => (
        <motion.div
            className={`glass-panel rounded-xl overflow-hidden card-hover h-full flex flex-col relative ${isSold ? 'grayscale-[0.5]' : ''}`}
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
            style={{
                borderColor: isLiveMoment ? '#FFD700' : ''
            }}
        >


            {/* Image Section */}
            <div className="relative h-72 bg-brand-dark-light group/image perspective-[1000px]">
                <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped && hasBackImage ? '[transform:rotateY(180deg)]' : ''}`}>
                    {/* Front Image */}
                    <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
                        {item.images && item.images.length > 0 ? (
                            <Image
                                src={item.images[0]}
                                alt={item.catalog.player_name}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-brand-platinum/30">
                                No Image
                            </div>
                        )}
                        {/* Live Moment Inner Glow */}
                        {isLiveMoment && (
                            <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(255,215,0,0.3)] mix-blend-overlay pointer-events-none" />
                        )}
                    </div>

                    {/* Back Image */}
                    {hasBackImage && (
                        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-brand-dark-light">
                            <Image
                                src={item.images[1]}
                                alt={`${item.catalog.player_name} Back`}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-cover"
                            />
                        </div>
                    )}
                </div>

                {/* Flip Button (Manual) */}
                {hasBackImage && !isSold && (
                    <button
                        onClick={handleFlip}
                        className="absolute bottom-3 right-3 z-20 p-2 rounded-full bg-black/60 text-white hover:bg-brand-blue hover:text-white transition-colors backdrop-blur-sm border border-white/10"
                        title="Flip Card"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                )}

                {/* SOLD Overlay */}
                {isSold && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 [backface-visibility:hidden]">
                        <div className="border-4 border-red-500 text-red-500 font-bold text-3xl px-6 py-2 transform -rotate-12 tracking-widest uppercase">
                            SOLD
                        </div>
                    </div>
                )}

                {/* Badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end z-10 [backface-visibility:hidden]">
                    <span className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded border border-white/10">
                        {item.catalog.year} {item.catalog.manufacturer}
                    </span>
                    {item.catalog.is_rookie && (
                        <span className="bg-brand-gold text-brand-dark text-xs font-bold px-2 py-1 rounded shadow-lg shadow-brand-gold/20 animate-pulse-slow">
                            RC
                        </span>
                    )}
                </div>
            </div>

            {/* Content Section */}
            <div className="p-5 flex-1 flex flex-col bg-gradient-to-b from-transparent to-black/40">
                <div className="mb-4">
                    <div className="flex justify-between items-start mb-2">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-brand-blue/20 text-brand-blue border border-brand-blue/30">
                            {item.catalog.team}
                        </span>
                        {item.catalog.rarity && (
                            <span className="text-[10px] text-brand-platinum/60 uppercase tracking-wider font-medium">
                                {item.catalog.rarity}
                            </span>
                        )}
                    </div>

                    <h2 className="font-heading text-lg font-bold text-white mb-1 group-hover:text-brand-blue-glow transition-colors truncate">
                        {item.catalog.player_name}
                    </h2>
                    <p className="text-xs text-brand-platinum/50 font-mono">
                        {item.catalog.series_name} #{item.catalog.card_number}
                    </p>
                </div>

                <div className="mt-auto pt-4 border-t border-brand-platinum/10 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] text-brand-platinum/50 uppercase tracking-wider mb-1">Price</p>
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-brand-gold flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                                <span className="text-[10px] text-brand-dark font-bold">¥</span>
                            </div>
                            <p className="font-heading text-lg font-bold text-white group-hover:text-brand-gold transition-colors">
                                {item.price?.toLocaleString() ?? '---'}
                            </p>
                        </div>
                    </div>
                    {!isSold && (
                        <div className="text-right border-l border-brand-platinum/10 pl-4">
                            <p className="text-[10px] text-brand-platinum/50 uppercase tracking-wider mb-1">Status</p>
                            <div className="flex items-center justify-end gap-1.5 text-brand-blue-glow">
                                <span className="font-mono text-sm font-medium">Active</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Live Moment Badge (Moved to bottom for stacking) */}
            {isLiveMoment && (
                <div className="absolute top-0 left-0 z-50 w-full overflow-hidden h-full pointer-events-none">
                    <div className="absolute top-3 left-3 px-2 py-0.5 bg-brand-gold text-brand-dark text-[10px] font-bold tracking-wider rounded shadow-lg shadow-brand-gold/20 border border-white/20 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                        LIVE
                        <span className="ml-1 pl-1 border-l border-brand-dark/20 font-mono">{timeLeft}</span>
                    </div>
                </div>
            )}

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 border-2 border-brand-blue/0 group-hover:border-brand-blue/50 rounded-xl transition-all duration-300 pointer-events-none"></div>
        </motion.div>
    );

    if (isSold) {
        return (
            <div className="block group cursor-not-allowed opacity-80">
                <Content />
            </div>
        );
    }

    return (
        <Link href={`/listings/${item.id}`} className="block group">
            <Content />
        </Link>
    );
}
