import Link from 'next/link';
import { ListingItem } from '../types'; // We'll need to ensure types are exported or defined here

interface ListingItemProps {
    item: ListingItem;
}

export default function CardListing({ item }: ListingItemProps) {
    return (
        <Link href={`/listings/${item.id}`} className="block group">
            <div className="glass-panel rounded-xl overflow-hidden card-hover h-full flex flex-col relative">
                {/* Image Section */}
                <div className="relative h-72 bg-brand-dark-light overflow-hidden group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-500">
                    {item.images && item.images.length > 0 ? (
                        <img
                            src={item.images[0]}
                            alt={item.catalog.player_name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/400x600?text=No+Image';
                            }}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-brand-platinum/30">
                            No Image
                        </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
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
                            <p className="text-[10px] text-brand-platinum/50 uppercase tracking-wider mb-1">Current Bid</p>
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full bg-brand-gold flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                                    <span className="text-[10px] text-brand-dark font-bold">¥</span>
                                </div>
                                <p className="font-heading text-lg font-bold text-white group-hover:text-brand-gold transition-colors">
                                    {item.price.toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <div className="text-right border-l border-brand-platinum/10 pl-4">
                            <p className="text-[10px] text-brand-platinum/50 uppercase tracking-wider mb-1">Time Left</p>
                            <div className="flex items-center justify-end gap-1.5 text-brand-blue-glow">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-mono text-sm font-medium">01:33:45</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 border-2 border-brand-blue/0 group-hover:border-brand-blue/50 rounded-xl transition-all duration-300 pointer-events-none"></div>
            </div>
        </Link>
    );
}
