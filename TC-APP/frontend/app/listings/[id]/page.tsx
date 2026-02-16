'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '../../../utils/supabase/client';
import Footer from '../../../components/Footer';
import { ListingItem } from '../../../types';
import AddToShowcaseModal from '../../../components/AddToShowcaseModal';
import MomentHistoryPanel from '../../../components/MomentHistoryPanel';

export default function ListingDetail() {
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params?.id as string;
    const isDebugLive = searchParams.get('live') === 'true';

    const [user, setUser] = useState<any>(null);
    const [listing, setListing] = useState<ListingItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Live Moment Logic
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [activeMoments, setActiveMoments] = useState<any[]>([]);
    const [momentsWithTime, setMomentsWithTime] = useState<any[]>([]);

    useEffect(() => {
        if (activeMoments.length === 0 && !isDebugLive) {
            setIsLiveActive(false);
            return;
        }

        setIsLiveActive(true);

        const updateTimers = () => {
            const now = new Date().getTime();
            const updated = activeMoments.map(m => {
                const createdTime = new Date(m.created_at).getTime();
                const end = createdTime + 60 * 60 * 1000;
                const distance = end - now;
                let timeLeft = '00:00';
                if (distance > 0) {
                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                    timeLeft = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
                return { ...m, timeLeft, endTime: end };
            });

            setMomentsWithTime(updated);

            const hasOngoing = updated.some(m => (m.endTime - now) > 0);
            setIsLiveActive(isDebugLive || hasOngoing);
        };

        updateTimers();
        const timer = setInterval(updateTimers, 1000);
        return () => clearInterval(timer);
    }, [activeMoments, isDebugLive]);

    // Derived state for pure visual toggle
    const isLiveMoment = isLiveActive;

    const fetchListingAndUser = async () => {
        const supabase = createClient();

        // Fetch User
        const { data: { user } = { user: null } } = await supabase.auth.getUser();
        setUser(user);

        // Use the id from the outer scope (useParams hook)
        if (!id) return;

        try {
            const { data, error } = await supabase
                .from('listing_items')
                .select('*, seller:profiles(*), origin_order:orders!origin_order_id(id, status, moment_snapshot), related_orders:orders!listing_id(id, buyer_id, status, moment_snapshot)')
                .eq('id', id)
                .single();

            if (error) {
                throw error;
            }

            // Self-Healing Moment Logic
            let listingData = data as any;
            let originOrder = Array.isArray(listingData.origin_order) ? listingData.origin_order[0] : listingData.origin_order;

            // Fallback: If origin_order is missing, look for a completed order where I am the buyer
            if (!originOrder && user && listingData.related_orders) {
                const myPurchase = listingData.related_orders.find((o: any) =>
                    o.buyer_id === user.id &&
                    (o.status === 'completed' || o.status === 'shipped' || o.status === 'paid' || o.status === 'delivered')
                );
                if (myPurchase) {
                    originOrder = myPurchase;
                }
            }

            if (originOrder && originOrder.moment_snapshot) {
                const snapshots = Array.isArray(originOrder.moment_snapshot) ? originOrder.moment_snapshot : [originOrder.moment_snapshot];
                const history = Array.isArray(listingData.moment_history) ? listingData.moment_history : [];

                const missingSnapshots = snapshots.filter((sn: any) =>
                    !history.some((h: any) => (h.moment_id === sn.id) || (h.id === sn.id))
                );

                if (missingSnapshots.length > 0) {
                    listingData = {
                        ...listingData,
                        moment_history: [
                            ...history,
                            ...missingSnapshots.map((sn: any) => ({
                                moment_id: sn.id,
                                timestamp: sn.created_at || new Date().toISOString(),
                                title: sn.title,
                                player_name: sn.player_name,
                                intensity: sn.intensity,
                                description: sn.description,
                                match_result: sn.match_result,
                                owner_at_time: originOrder.id,
                                status: 'finalized'
                            }))
                        ]
                    };
                }
            }

            setListing(listingData);
            if (data.images && data.images.length > 0) {
                setSelectedImage(data.images[0]);
            }

            // CHECK LIVE MOMENTS
            const now = new Date();
            const lookback = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
            const listingPlayerName = (data.player_name || '').toLowerCase();

            const { data: moments } = await supabase
                .from('live_moments')
                .select('*')
                .gt('created_at', lookback)
                .order('created_at', { ascending: false });

            if (moments && moments.length > 0) {
                const matched = moments.filter(m => {
                    const activePlayer = (m.player_name || '').toLowerCase();
                    if (listingPlayerName.includes(activePlayer)) return true;
                    if (activePlayer.includes(listingPlayerName)) return true;
                    return false;
                });

                setActiveMoments(matched);
            } else {
                setActiveMoments([]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchListingAndUser();
    }, [id]);

    const handleEditSuccess = () => {
        setIsEditModalOpen(false);
        window.location.reload();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue"></div>
            </div>
        );
    }

    if (error || !listing) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-brand-dark">
                <div className="text-red-500 text-xl font-semibold mb-4 bg-red-500/10 px-6 py-4 rounded-lg border border-red-500/20">Error: {error || 'Listing not found'}</div>
                <Link href="/" className="text-brand-blue hover:text-brand-blue-glow hover:underline transition-colors">
                    Back to Market
                </Link>
            </div>
        );
    }

    // Helper to get seller display name
    const getSellerName = (seller: any) => {
        if (!seller) return 'Unknown Seller';
        return seller.display_name || seller.name || 'Trading Card Collector';
    };

    return (
        <div className="min-h-screen bg-brand-dark pt-32 pb-32 px-4 sm:px-6 lg:px-8 flex flex-col">
            <div className="max-w-7xl mx-auto w-full flex-1">
                <nav className="mb-8">
                    <Link href="/market" className="text-brand-platinum hover:text-white font-medium flex items-center transition-colors group">
                        <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> マーケットに戻る
                    </Link>
                </nav>

                <div className={`glass-panel-premium rounded-2xl shadow-2xl overflow-hidden border ${isLiveMoment ? 'border-brand-gold/50' : 'border-white/10'} transition-colors duration-500`}>
                    <div className="md:flex">
                        {/* Image Gallery Section */}
                        <div className="md:w-1/2 p-2 md:p-8 bg-brand-dark-light/50 relative overflow-hidden">
                            {/* Live Moment Ambient Background */}
                            {isLiveMoment && (
                                <div className="absolute inset-0 z-0">
                                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-brand-gold/5 to-transparent mix-blend-overlay pointer-events-none" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand-gold/10 blur-[100px] animate-pulse-slow pointer-events-none" />
                                </div>
                            )}

                            <motion.div
                                className={`mb-6 aspect-[2/3] relative rounded-xl bg-brand-dark group perspective-[1000px] z-10`}
                                animate={isLiveMoment ? {
                                    boxShadow: [
                                        "0 0 20px rgba(255, 69, 0, 0.3)",
                                        "0 0 50px rgba(255, 69, 0, 0.6)",
                                        "0 0 20px rgba(255, 69, 0, 0.3)"
                                    ],
                                    borderColor: [
                                        "rgba(255, 69, 0, 0.4)",
                                        "rgba(255, 69, 0, 1)",
                                        "rgba(255, 69, 0, 0.4)"
                                    ]
                                } : {}}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                style={{
                                    borderWidth: isLiveMoment ? '2px' : '1px',
                                    borderStyle: 'solid',
                                    borderColor: isLiveMoment ? '#FF4500' : 'rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                {/* Live Moment Badges */}
                                {isLiveActive && (
                                    <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
                                        {isDebugLive && momentsWithTime.length === 0 && (
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-red-600 blur-lg opacity-50 animate-pulse"></div>
                                                <div className="relative px-3 py-1 bg-gradient-to-r from-red-600 to-red-500 text-white text-[10px] font-bold tracking-widest uppercase rounded shadow-lg border border-white/30 flex items-center gap-2">
                                                    <span className="text-sm">🔥</span>
                                                    DEBUG LIVE
                                                    <span className="ml-2 pl-2 border-l border-white/20 font-mono text-xs">60:00</span>
                                                </div>
                                            </div>
                                        )}
                                        {momentsWithTime.map((m) => (
                                            <div key={m.id} className="relative">
                                                <div className="absolute inset-0 bg-red-600 blur-lg opacity-50 animate-pulse"></div>
                                                <div className="relative px-3 py-1 bg-gradient-to-r from-red-600 to-red-500 text-white text-[10px] font-bold tracking-widest uppercase rounded shadow-lg border border-white/30 flex items-center gap-2">
                                                    <span className="text-sm">🔥</span>
                                                    {m.title || 'LIVE MOMENT'}
                                                    <span className="ml-2 pl-2 border-l border-white/20 font-mono text-xs">{m.timeLeft}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${selectedImage === listing.images[1] ? '[transform:rotateY(180deg)]' : ''}`}>
                                    {/* Front Image (Image 0) */}
                                    <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-xl overflow-hidden shadow-2xl">
                                        {listing.images && listing.images.length > 0 ? (
                                            <>
                                                <Image
                                                    src={listing.images[0]}
                                                    alt={listing.player_name || "Card Image"}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, 50vw"
                                                    className="object-contain p-0 md:p-4 bg-brand-dark-light/50"
                                                />
                                                {/* Inner Glow Overlay */}
                                                {isLiveMoment && (
                                                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_50px_rgba(255,215,0,0.3)] rounded-xl mix-blend-overlay" />
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-brand-platinum/30">No Image</div>
                                        )}
                                    </div>

                                    {/* Back Image (Image 1) */}
                                    {listing.images && listing.images.length > 1 && (
                                        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl overflow-hidden shadow-2xl bg-brand-dark-light/50">
                                            <Image
                                                src={listing.images[1]}
                                                alt={`${listing.player_name || ''} Back`}
                                                fill
                                                sizes="(max-width: 768px) 100vw, 50vw"
                                                className="object-contain p-4"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Glow Effect Behind Image (Enhanced for Live Moment) */}
                                <div className={`absolute inset-0 blur-3xl -z-10 ${isLiveMoment ? 'bg-brand-gold/20' : 'bg-brand-blue/5'}`}></div>
                            </motion.div>

                            {/* Thumbnails */}
                            {listing.images && listing.images.length > 1 && (
                                <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
                                    {listing.images.map((img: string, index: number) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedImage(img)}
                                            className={`w-20 h-28 flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all ${selectedImage === img ? 'border-brand-blue shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                        >
                                            <div className="relative w-full h-full">
                                                <Image
                                                    src={img}
                                                    alt={`View ${index + 1}`}
                                                    fill
                                                    sizes="80px"
                                                    className="object-cover"
                                                />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Product Details Section */}
                        <div className="md:w-1/2 p-10 flex flex-col">
                            <div className="mb-8">
                                {/* Active Moment Context Box */}
                                {momentsWithTime.length > 0 && (
                                    <div className="flex flex-col gap-4 mb-6">
                                        {momentsWithTime.map((m) => (
                                            <div key={m.id} className="p-4 rounded-xl bg-gradient-to-r from-red-900/40 to-black border border-red-500/30 relative overflow-hidden group/live shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                                <div className="absolute top-0 right-0 p-2 opacity-10">
                                                    <svg className="w-16 h-16 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 1012.12 15.12z" clipRule="evenodd" /></svg>
                                                </div>
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                        </span>
                                                        <p className="text-red-400 text-xs font-bold tracking-widest uppercase">HAPPENING NOW</p>
                                                        <span className="text-brand-platinum/40 text-xs">•</span>
                                                        <p className="text-brand-platinum/60 text-xs font-mono">{m.match_result || 'Live Match'}</p>
                                                    </div>
                                                    <h3 className="text-white font-bold text-lg mb-1 leading-tight">{m.title}</h3>
                                                    <p className="text-brand-platinum/80 text-sm line-clamp-2">{m.description}</p>
                                                    <div className="mt-3 flex items-center gap-3">
                                                        <div className="px-2 py-0.5 bg-red-500/20 rounded border border-red-500/30">
                                                            <span className="text-[10px] text-red-400 font-bold font-mono">{m.timeLeft} REMAINING</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            {[...Array(m.intensity || 1)].map((_, i) => (
                                                                <span key={i} className="text-red-500 text-xs">🔥</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center space-x-3 mb-4">
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-blue/10 text-brand-blue border border-brand-blue/20 uppercase tracking-wider">
                                        {listing.team || 'Unknown Team'}
                                    </span>
                                    {listing.is_rookie && (
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-gold/10 text-brand-gold border border-brand-gold/20 uppercase tracking-wider animate-pulse-slow">
                                            Rookie Card
                                        </span>
                                    )}
                                    {listing.is_autograph && (
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                                            Autograph
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-2 text-glow">{listing.player_name || 'Unknown Player'}</h1>
                                <p className="text-xl text-brand-platinum/80 font-light">{listing.year} {listing.manufacturer} {listing.series_name || ''}</p>
                                <p className="text-brand-platinum/50 mt-2 text-sm">
                                    Card #{listing.card_number || '---'}
                                    {listing.serial_number && ` • SN: ${listing.serial_number}`}
                                    {listing.variation && ` • ${listing.variation}`}
                                </p>

                                {/* Seller Info */}
                                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-brand-platinum/10">
                                    <div className="w-10 h-10 rounded-full bg-brand-platinum/10 overflow-hidden relative">
                                        <Image
                                            src={listing.seller?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.seller?.display_name || listing.seller?.email || 'Seller'}`}
                                            alt="Seller"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs text-brand-platinum/50 uppercase tracking-wider">出品者</p>
                                        <Link href={`/profile/${listing.seller_id}`} className="text-white font-medium hover:text-brand-blue transition-colors">
                                            {getSellerName(listing.seller)}
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* --- Product Details (Spec Sheet) --- */}
                            <div className="border-t border-brand-platinum/10 py-6">
                                <h3 className="text-sm font-bold text-brand-platinum/40 uppercase tracking-widest mb-4">商品詳細 (Product Details)</h3>
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                                    <div className="col-span-1">
                                        <dt className="text-brand-platinum/50 text-xs uppercase tracking-wider mb-1">チーム (Team)</dt>
                                        <dd className="font-medium text-white">{listing.team || '---'}</dd>
                                    </div>
                                    <div className="col-span-1">
                                        <dt className="text-brand-platinum/50 text-xs uppercase tracking-wider mb-1">年度 (Year)</dt>
                                        <dd className="font-medium text-white">{listing.year || '---'}</dd>
                                    </div>
                                    <div className="col-span-1">
                                        <dt className="text-brand-platinum/50 text-xs uppercase tracking-wider mb-1">ブランド (Brand)</dt>
                                        <dd className="font-medium text-white">{listing.manufacturer || '---'}</dd>
                                    </div>
                                    {listing.variation && (
                                        <div className="col-span-1">
                                            <dt className="text-brand-platinum/50 text-xs uppercase tracking-wider mb-1">バリエーション</dt>
                                            <dd className="font-medium text-white">{listing.variation}</dd>
                                        </div>
                                    )}
                                    {listing.serial_number && (
                                        <div className="col-span-1">
                                            <dt className="text-brand-platinum/50 text-xs uppercase tracking-wider mb-1">シリアル番号</dt>
                                            <dd className="font-mono text-brand-gold">{listing.serial_number}</dd>
                                        </div>
                                    )}
                                </dl>
                            </div>

                            {/* --- Description --- */}
                            {listing.description && (
                                <div className="border-t border-brand-platinum/10 py-6">
                                    <h3 className="text-sm font-bold text-brand-platinum/40 uppercase tracking-widest mb-3">商品説明 (Description)</h3>
                                    <p className="text-brand-platinum/80 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
                                </div>
                            )}

                            <div className="border-t border-brand-platinum/10 py-8">
                                <h3 className="text-sm font-bold text-brand-platinum/40 uppercase tracking-widest mb-6">状態・グレーディング (Condition)</h3>
                                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                    <div>
                                        <p className="text-xs text-brand-platinum/50 uppercase mb-1">鑑定有無 (Graded)</p>
                                        <p className="font-medium text-white text-lg">{listing.condition_grading.is_graded ? 'あり (Yes)' : 'なし (No)'}</p>
                                    </div>
                                    {!listing.condition_grading.is_graded && (
                                        <div>
                                            <p className="text-xs text-brand-platinum/50 uppercase mb-1">状態 (Condition)</p>
                                            <p className="font-medium text-white text-lg">{listing.condition_rating || listing.condition_grading.service || '---'}</p>
                                        </div>
                                    )}
                                    {listing.condition_grading.is_graded && (
                                        <>
                                            <div>
                                                <p className="text-xs text-brand-platinum/50 uppercase mb-1">鑑定機関 (Service)</p>
                                                <p className="font-medium text-white text-lg">{listing.condition_grading.service}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-brand-platinum/50 uppercase mb-1">グレード点数 (Score)</p>
                                                <p className="font-heading font-bold text-3xl text-brand-blue text-glow">{listing.condition_grading.score}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-brand-platinum/50 uppercase mb-1">証明番号 (Cert #)</p>
                                                <p className="font-mono text-sm text-brand-platinum">{listing.condition_grading.certification_number}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* --- Moment History Timeline --- */}
                            {(() => {
                                // Merge Active (Live) Moments into the history for display
                                const displayHistory = [...(listing.moment_history || [])];

                                // Inject Active Moments for ALL listings (including owned)
                                // This encourages owners to sell when a card is "hot" (Live).
                                // [RESTORED & REFINED] Per user request (Step 7743), we restore this injection BUT with a check.
                                // If the Active Moment matches a moment captured in the Purchase Snapshot (origin_order),
                                // we treat it as "Real" (is_virtual: false), allowing the owner to write memories.
                                // Otherwise, it implies a Future Event (Opportunity), so we treat it as "Virtual" (Read-only).

                                const originOrder = listing.origin_order ? (Array.isArray(listing.origin_order) ? listing.origin_order[0] : listing.origin_order) : null;
                                const snapshotIds = originOrder && originOrder.moment_snapshot
                                    ? (Array.isArray(originOrder.moment_snapshot) ? originOrder.moment_snapshot.map((s: any) => s.id) : [originOrder.moment_snapshot.id])
                                    : [];

                                activeMoments.forEach(am => {
                                    const isAlreadyAccountedFor = displayHistory.some((m: any) =>
                                        (m.moment_id === am.id) || (m.id === am.id)
                                    );

                                    if (!isAlreadyAccountedFor) {
                                        // Check if this active moment was captured in the purchase snapshot
                                        const isCapturedInSnapshot = snapshotIds.includes(am.id);

                                        // [CHANGED] Strictly HIDE virtual moments from the history list.
                                        // Only show active moments if they are part of the OWNED history (captured in snapshot).
                                        if (isCapturedInSnapshot) {
                                            displayHistory.push({
                                                id: am.id,
                                                moment_id: am.id,
                                                title: am.title,
                                                description: am.description,
                                                timestamp: am.created_at,
                                                status: 'live', // Mark as live
                                                player_name: am.player_name,
                                                intensity: am.intensity,
                                                match_result: am.match_result,
                                                is_virtual: false // It is real/owned
                                            } as any);
                                        }
                                    }
                                });

                                return (
                                    <MomentHistoryPanel
                                        history={displayHistory}
                                        itemId={listing.id}
                                        isOwner={user?.id === listing.seller_id}
                                        onSuccess={fetchListingAndUser}
                                    />
                                );
                            })()}

                            <div className="border-t border-brand-platinum/10 pt-8 mt-auto">
                                <div className="flex items-end justify-between mb-8">
                                    <div>
                                        <p className="text-sm text-brand-platinum/50 uppercase tracking-wider mb-1">
                                            {listing.status === 'Display' ? 'ステータス' : '現在価格'}
                                        </p>
                                        {listing.status === 'Display' ? (
                                            <span className="px-4 py-2 rounded-lg bg-brand-platinum/10 border border-brand-platinum/20 text-white font-bold tracking-wider">
                                                展示のみ (Display Only)
                                            </span>
                                        ) : (
                                            <p className="text-5xl font-heading font-bold text-brand-gold text-gold-glow tracking-tight">
                                                ¥{listing.price?.toLocaleString() ?? '---'}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {user?.id === listing.seller_id ? (
                                    <div className="bg-brand-dark-light/50 p-6 rounded-xl text-center border border-brand-platinum/10">
                                        <p className="text-brand-platinum font-medium">あなたの出品商品です。</p>
                                        <button
                                            onClick={() => setIsEditModalOpen(true)}
                                            className="mt-4 text-brand-blue hover:text-brand-blue-glow text-sm font-bold uppercase tracking-wider transition-colors"
                                        >
                                            出品を編集
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {listing.status === 'Active' ? (
                                            <>
                                                <Link
                                                    href={`/checkout/${listing.id}`}
                                                    className="block w-full bg-brand-blue hover:bg-brand-blue-glow text-white text-xl font-bold py-5 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] hover:scale-[1.02] text-center"
                                                >
                                                    購入手続きへ
                                                </Link>
                                                <div className="flex items-center justify-center mt-6 gap-2 text-brand-platinum/40 text-sm">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                    Secure transaction via Stripe
                                                </div>
                                            </>
                                        ) : ['TransactionPending', 'AwaitingShipment'].includes(listing.status) ? (
                                            <div className="bg-brand-gold/5 p-6 rounded-xl text-center border border-brand-gold/20">
                                                <div className="flex items-center justify-center gap-2 mb-2">
                                                    <span className="relative flex h-2.5 w-2.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-gold"></span>
                                                    </span>
                                                    <p className="text-brand-gold font-bold text-sm uppercase tracking-wider">
                                                        {listing.status === 'TransactionPending' ? '取引進行中' : '配送準備中'}
                                                    </p>
                                                </div>
                                                <p className="text-brand-platinum/50 text-sm">
                                                    この商品は現在購入できません。
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="bg-brand-dark-light/30 p-6 rounded-xl text-center border border-brand-platinum/5">
                                                <p className="text-brand-platinum/60">
                                                    この商品は{listing.status === 'Display' ? '展示のみで' : '現在'}購入できません。
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />

            <AddToShowcaseModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onAdded={handleEditSuccess}
                mode="edit"
                initialData={listing}
            />
        </div>
    );
}
