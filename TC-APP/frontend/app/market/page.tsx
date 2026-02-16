'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';
import CardListing from '../../components/CardListing';
import Footer from '../../components/Footer';
import { ListingItem, Team } from '../../types';

function MarketPageContent() {
    const searchParams = useSearchParams();
    const isDebugLive = searchParams.get('live') === 'true'; // Debug Mode

    const [listings, setListings] = useState<ListingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [sortOrder, setSortOrder] = useState('newest');

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const fetchListings = async () => {
            setLoading(true);
            try {
                const supabase = createClient();
                const now = new Date();
                const lookback = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

                // 1. Fetch Active Live Moments
                const { data: activeMoments } = await supabase
                    .from('live_moments')
                    .select('player_name, created_at')
                    .gt('created_at', lookback);

                // Store full objects for time calculation
                const momentsData = activeMoments || [];

                const activePlayers = Array.from(new Set(momentsData?.map(m => (m.player_name || '').toLowerCase().trim()) || []));
                console.log("Active Players (Live):", activePlayers);

                // Helper to build base query with filters
                const buildBaseQuery = () => {
                    let q = supabase
                        .from('listing_items')
                        .select('*')
                        .eq('status', 'Active');

                    if (selectedTeam) {
                        q = q.eq('team', selectedTeam);
                    }
                    return q;
                };

                let finalData: any[] = [];

                if (sortOrder === 'newest' && activePlayers.length > 0) {
                    // --- Priority Logic ---

                    // A. Fetch Priority Listings (Matches Active Players)
                    // A. Fetch Priority Listings (Matches Active Players)
                    let pQuery = buildBaseQuery()
                        .in('player_name', activePlayers)
                        .order('created_at', { ascending: false });

                    // B. Fetch Regular Listings (Non-Active Players)
                    const activePlayersList = `(${activePlayers.map(p => `"${p}"`).join(',')})`;
                    let rQuery = buildBaseQuery()
                        .not('player_name', 'in', activePlayersList)
                        .order('created_at', { ascending: false });

                    // Execute in parallel
                    const [pRes, rRes] = await Promise.all([pQuery, rQuery]);

                    if (pRes.error) throw pRes.error;
                    if (rRes.error) throw rRes.error;

                    finalData = [...(pRes.data || []), ...(rRes.data || [])];

                } else {
                    // --- Standard Logic ---
                    let query = buildBaseQuery();

                    if (sortOrder === 'newest') {
                        query = query.order('created_at', { ascending: false });
                    } else if (sortOrder === 'price_asc') {
                        query = query.order('price', { ascending: true, nullsFirst: false });
                    } else if (sortOrder === 'price_desc') {
                        query = query.order('price', { ascending: false, nullsFirst: false });
                    }

                    const { data, error } = await query;
                    if (error) throw error;
                    finalData = data || [];
                }

                // Client-side Text Search (as before)
                if (debouncedSearch) {
                    const lowerSearch = debouncedSearch.toLowerCase();
                    finalData = finalData.filter((item: any) =>
                        (item.player_name || '').toLowerCase().includes(lowerSearch) ||
                        (item.manufacturer || '').toLowerCase().includes(lowerSearch) ||
                        (item.series_name || '').toLowerCase().includes(lowerSearch)
                    );
                }

                // INJECT LIVE MOMENT FLAG
                // This ensures the CardListing receives true if player is in the active list (Case Insensitive & Fuzzy)
                finalData = finalData.map((item: any) => {
                    const itemName = (item.player_name || '').toLowerCase();

                    // Find all matching moments (Multiple Moments Support)
                    const matchedMoments = momentsData.filter((m: any) => {
                        const p1 = (m.player_name || '').toLowerCase();
                        if (itemName.includes(p1)) return true;
                        if (p1.includes(itemName)) return true;
                        return false;
                    });

                    // Store all end times as an array
                    const liveMoments = matchedMoments.map((m: any) => {
                        let endTime = null;
                        if (m.created_at) {
                            const created = new Date(m.created_at).getTime();
                            if (!isNaN(created)) {
                                endTime = created + 60 * 60 * 1000;
                            }
                        }
                        return {
                            id: m.id,
                            title: m.title,
                            endTime: endTime
                        };
                    }).filter(m => m.endTime !== null);

                    return {
                        ...item,
                        is_live_moment: liveMoments.length > 0,
                        live_moments: liveMoments
                    };
                });

                setListings(finalData);

            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchListings();
    }, [debouncedSearch, selectedTeam, sortOrder]);

    const teams: Team[] = ["Giants", "Tigers", "Dragons", "Swallows", "Carp", "BayStars", "Hawks", "Fighters", "Marines", "Buffaloes", "Eagles", "Lions"];

    const teamDisplayNames: Record<Team, string> = {
        Giants: "読売ジャイアンツ",
        Tigers: "阪神タイガース",
        Dragons: "中日ドラゴンズ",
        Swallows: "ヤクルトスワローズ",
        Carp: "広島カープ",
        BayStars: "横浜ベイスターズ",
        Hawks: "ソフトバンクホークス",
        Fighters: "日本ハムファイターズ",
        Marines: "千葉ロッテマリーンズ",
        Buffaloes: "オリックスバファローズ",
        Eagles: "楽天イーグルス",
        Lions: "埼玉西武ライオンズ",
        SamuraiJapan: "侍ジャパン",
        Other: "その他"
    };

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 relative z-20 flex-1 w-full">
                <div className="mb-8">
                    <h1 className="text-4xl font-heading font-bold text-white mb-2">マーケット</h1>
                    <p className="text-brand-platinum/60">プレミアムなプロ野球カードを探そう</p>
                </div>

                {/* Search & Filter Bar */}
                <div className="glass-panel-premium p-6 rounded-2xl shadow-2xl mb-12 animate-fade-in-up">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        {/* Search Input */}
                        <div className="flex-1 w-full">
                            <label htmlFor="search" className="sr-only">Search</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-brand-platinum/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    id="search"
                                    placeholder="選手名、シリーズ名、年度で検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white placeholder-brand-platinum/30 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {/* Team Filter */}
                        <div className="w-full md:w-48">
                            <label htmlFor="team" className="sr-only">Team</label>
                            <select
                                id="team"
                                value={selectedTeam}
                                onChange={(e) => setSelectedTeam(e.target.value)}
                                className="block w-full py-3 px-4 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all appearance-none"
                            >
                                <option value="">すべてのチーム</option>
                                {teams.map((team) => (
                                    <option key={team} value={team}>{teamDisplayNames[team]}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sort Order */}
                        <div className="w-full md:w-48">
                            <label htmlFor="sort" className="sr-only">Sort</label>
                            <select
                                id="sort"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="block w-full py-3 px-4 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all appearance-none"
                            >
                                <option value="newest">新着順</option>
                                <option value="price_asc">価格: 安い順</option>
                                <option value="price_desc">価格: 高い順</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Listings Grid */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-heading font-bold text-white">出品一覧</h2>
                        <span className="text-brand-platinum/60 text-sm">{listings.length} 件見つかりました</span>
                    </div>

                    {loading ? (
                        <div className="min-h-[400px] flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue"></div>
                        </div>
                    ) : error ? (
                        <div className="min-h-[400px] flex items-center justify-center">
                            <div className="text-red-500 text-xl font-semibold bg-red-500/10 px-6 py-4 rounded-lg border border-red-500/20">Error: {error}</div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                                {listings.map((item) => (
                                    <CardListing
                                        key={item.id}
                                        item={item}
                                        isLiveMoment={(item as any).is_live_moment || isDebugLive}
                                        liveMoments={(item as any).live_moments}
                                    />
                                ))}
                            </div>

                            {listings.length === 0 && (
                                <div className="text-center py-20 bg-brand-dark-light/30 rounded-2xl border border-brand-platinum/5">
                                    <p className="text-brand-platinum/50 text-lg">該当する出品が見つかりませんでした。</p>
                                    <button
                                        onClick={() => { setSearchQuery(''); setSelectedTeam(''); }}
                                        className="mt-4 text-brand-blue hover:text-brand-blue-glow font-medium"
                                    >
                                        フィルターをクリア
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    );
}

export default function MarketPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-brand-dark flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div></div>}>
            <MarketPageContent />
        </Suspense>
    );
}
