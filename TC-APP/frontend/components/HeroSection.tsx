'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ListingItem } from '../types';

import { createClient } from '../utils/supabase/client';

export default function HeroSection() {
    const [user, setUser] = useState<any>(null);
    const [featuredCard, setFeaturedCard] = useState<ListingItem | null>(null);

    useEffect(() => {
        const fetchFeaturedAndUser = async () => {
            const supabase = createClient();

            // Fetch User
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            // Fetch Featured Card
            try {
                const { data, error } = await supabase
                    .from('listing_items')
                    .select('*, catalog:card_catalogs(*)')
                    .eq('status', 'Active')
                    .not('price', 'is', null)
                    .order('price', { ascending: false })
                    .limit(1);

                if (error) throw error;

                if (data && data.length > 0) {
                    setFeaturedCard(data[0] as any);
                }
            } catch (error) {
                console.error("Failed to fetch featured card:", error);
            }
        };
        fetchFeaturedAndUser();
    }, []);

    return (
        <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center bg-brand-dark pt-32 pb-48">
            {/* Spotlight Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {/* Main Top Spotlight */}
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-gold/20 rounded-full blur-[100px] opacity-60 animate-pulse-slow"></div>
                {/* Side Blue Glows */}
                <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-brand-blue/10 rounded-full blur-[120px]"></div>
                <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-brand-blue/10 rounded-full blur-[120px]"></div>
                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20 bg-center"></div>
            </div>

            {/* Floating Card Display */}
            <div className="relative z-10 mb-12 animate-float">
                <div className="relative w-64 h-96 md:w-80 md:h-[500px] rounded-2xl p-2 bg-gradient-to-b from-brand-platinum/20 to-brand-dark-light/80 backdrop-blur-md border border-brand-platinum/30 shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                    {/* Spotlight Beam */}
                    <div className="absolute -top-[150%] left-1/2 -translate-x-1/2 w-[100px] h-[500px] bg-gradient-to-b from-white/20 via-brand-gold/10 to-transparent blur-xl rotate-[15deg] transform-origin-top animate-pulse-slow pointer-events-none z-20"></div>

                    {/* Inner Card Frame */}
                    <div className="w-full h-full rounded-xl overflow-hidden relative border border-brand-blue/30 bg-brand-dark-light group cursor-pointer">
                        {featuredCard ? (
                            <Link href={`/listings/${featuredCard.id}`}>
                                {/* Card Image */}
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-dark-light to-brand-blue/20 flex items-center justify-center">
                                    {!featuredCard.images?.[0] && <span className="text-brand-platinum/20 font-heading text-6xl font-bold">TC</span>}
                                </div>
                                {featuredCard.images?.[0] && (
                                    <img
                                        src={featuredCard.images[0]}
                                        alt={featuredCard.catalog.player_name}
                                        className="w-full h-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                                    />
                                )}

                                {/* Holo Effect Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-50 group-hover:opacity-70 transition-opacity"></div>

                                {/* Shimmer Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shimmer pointer-events-none"></div>

                                {/* Card Details Overlay */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-brand-gold text-xs font-bold tracking-widest mb-1 uppercase">
                                                {featuredCard.catalog.rarity || 'PREMIUM'}
                                            </p>
                                            <h3 className="text-white font-heading text-xl font-bold leading-tight">
                                                {featuredCard.catalog.player_name}
                                            </h3>
                                            <p className="text-brand-platinum/80 text-xs mt-1">
                                                {featuredCard.catalog.year} {featuredCard.catalog.manufacturer}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-brand-gold text-gold-glow text-lg font-bold">
                                                ¥{featuredCard.price?.toLocaleString() ?? '---'}
                                            </p>
                                            {featuredCard.condition_grading?.is_graded && (
                                                <p className="text-brand-platinum/60 text-[10px] uppercase">
                                                    {featuredCard.condition_grading.service} {featuredCard.condition_grading.score}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            // Loading / Placeholder State
                            <div className="w-full h-full flex items-center justify-center bg-brand-dark-light">
                                <div className="animate-pulse flex flex-col items-center">
                                    <div className="h-12 w-12 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-brand-platinum/50 text-sm">Loading Featured Card...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Outer Glow Ring */}
                    <div className="absolute -inset-4 border border-brand-blue/20 rounded-3xl -z-10 animate-pulse-slow"></div>
                    <div className="absolute -inset-1 bg-gradient-to-b from-brand-gold/20 to-transparent rounded-2xl -z-10 blur-md"></div>
                    {/* Rotating Glow */}
                    <div className="absolute -inset-[100%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,215,0,0.1)_90deg,transparent_180deg)] rounded-full animate-rotate-slow -z-20 opacity-50 blur-2xl"></div>
                </div>
            </div>

            <div className="relative z-10 container mx-auto px-4 text-center">
                <h1 className="font-heading text-5xl md:text-7xl font-bold mb-4 tracking-tight animate-fade-in-up">
                    <span className="text-brand-gold drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">THE FUTURE OF TRADING.</span><br />
                    <span className="text-brand-blue drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                        COLLECT THE UNTOUCHABLE.
                    </span>
                </h1>

                <p className="text-brand-platinum/80 text-lg md:text-xl mb-10 max-w-2xl mx-auto animate-fade-in-up delay-200">
                    Experience the next generation of sports card collecting.
                    Verify, trade, and showcase your assets in a premium ecosystem.
                </p>

                <div className="flex flex-col md:flex-row gap-6 justify-center">
                    {user ? (
                        <Link
                            href="/market"
                            className="group relative px-8 py-4 bg-brand-blue text-white font-bold rounded-full overflow-hidden transition-all hover:scale-105 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            <span className="relative z-10">EXPLORE MARKETPLACE</span>
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/register"
                                className="group relative px-8 py-4 bg-brand-gold text-brand-dark font-bold rounded-full overflow-hidden transition-all hover:scale-105 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                <span className="relative z-10">SIGN UP NOW</span>
                            </Link>
                            <Link
                                href="/login"
                                className="px-8 py-4 bg-white/5 text-white font-bold rounded-full border border-white/10 hover:bg-white/10 transition-all hover:scale-105 backdrop-blur-md"
                            >
                                SIGN IN
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
