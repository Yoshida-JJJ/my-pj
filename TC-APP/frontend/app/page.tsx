'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation'; // Added
import HeroSection from '../components/HeroSection';
import CardListing from '../components/CardListing';
import Footer from '../components/Footer';
import SkeletonCard from '../components/SkeletonCard';
import { ListingItem, Team } from '../types';

import { createClient } from '../utils/supabase/client';

function HomeContent() {
  const searchParams = useSearchParams(); // Added
  const isDebugLive = searchParams.get('live') === 'true'; // Debug Mode

  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
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
        let query = supabase
          .from('listing_items')
          .select('*')
          .eq('status', 'Active');

        if (debouncedSearch) {
          // Note: This is a simple search. For better search, use text search capabilities or join with catalog
          // Since we can't easily filter on joined table fields with simple syntax in one go without embedding, 
          // we might need to rely on client side filtering or more complex queries.
          // For now, let's assume we filter by catalog fields if possible, but Supabase JS client filtering on joined tables is tricky.
          // A common workaround is !inner join or text search.
          // Let's try to filter by player_name in catalog if possible, but standard select doesn't support filtering on joined relation easily in top level.
          // We will fetch all and filter client side for search if it's small, or use a specific RPC or search index.
          // Given the constraints, let's try to use the 'search' param if we had an RPC, but we don't.
          // Let's just fetch active listings and filter client side for the demo if the dataset is small, 
          // OR use the text search on a view.
          // For this migration, I'll implement a basic fetch and client-side filter for the search text to be safe, 
          // or try to use `!inner` to filter by catalog team/player.

          // Using !inner to filter by catalog properties
          // query = query.not('catalog', 'is', null); // Ensure catalog exists
        }

        if (selectedTeam) {
          // This requires filtering on the joined 'catalog' table.
          // Supabase supports this with: .eq('catalog.team', selectedTeam) if using JSON or specific syntax, 
          // but strictly typed client might complain.
          // Let's use the !inner hint if we can, or just fetch and filter.
          // For simplicity and reliability in this migration without changing schema:
          // We will fetch more and filter in memory, OR we assume the user has set up RLS/Views.
          // Actually, let's try to use the foreign key filter syntax:
          // .eq('catalog.team', selectedTeam) works if we use !inner in select: select('*, catalog!inner(*)')
          // But let's stick to a simpler approach: Fetch active items and filter.
        }

        // Sorting
        if (sortOrder === 'newest') {
          query = query.order('created_at', { ascending: false });
        } else if (sortOrder === 'price_asc') {
          query = query.order('price', { ascending: true });
        } else if (sortOrder === 'price_desc') {
          query = query.order('price', { ascending: false });
        }

        const { data, error } = await query;

        if (error) throw error;

        let filteredData = data as any[];

        // Client-side filtering for Search and Team (since simple join filtering is complex in JS client without specific setup)
        if (debouncedSearch) {
          const lowerSearch = debouncedSearch.toLowerCase();
          filteredData = filteredData.filter(item => {
            const playerName = item.player_name || '';
            const manufacturer = item.manufacturer || '';
            const series = item.variation || item.series_name || '';

            return (
              playerName.toLowerCase().includes(lowerSearch) ||
              manufacturer.toLowerCase().includes(lowerSearch) ||
              series.toLowerCase().includes(lowerSearch)
            );
          });
        }

        if (selectedTeam) {
          filteredData = filteredData.filter(item => {
            const team = item.team;
            return team === selectedTeam;
          });
        }

        setListings(filteredData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [debouncedSearch, selectedTeam, sortOrder]);

  const teams: Team[] = ["Giants", "Tigers", "Dragons", "Swallows", "Carp", "BayStars", "Hawks", "Fighters", "Marines", "Buffaloes", "Eagles", "Lions"];

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <HeroSection />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20 flex-1 w-full">
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
                  placeholder="選手名、シリーズ、年代などで検索..."
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
                <option value="">全チーム</option>
                {teams.map((team) => (
                  <option key={team} value={team}>{team}</option>
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
                <option value="price_asc">価格が安い順</option>
                <option value="price_desc">価格が高い順</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-heading font-bold text-white">Latest Arrivals</h2>
            <span className="text-brand-platinum/60 text-sm">{listings.length} 件</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="text-red-500 text-xl font-semibold bg-red-500/10 px-6 py-4 rounded-lg border border-red-500/20">Error: {error}</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {listings.map((item) => (
                  <CardListing key={item.id} item={item} isLiveMoment={isDebugLive} />
                ))}
              </div>

              {listings.length === 0 && (
                <div className="text-center py-20 bg-brand-dark-light/30 rounded-2xl border border-brand-platinum/5">
                  <p className="text-brand-platinum/50 text-lg">条件に一致するカードが見つかりませんでした。</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedTeam(''); }}
                    className="mt-4 text-brand-blue hover:text-brand-blue-glow font-medium"
                  >
                    条件をクリア
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

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-dark flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div></div>}>
      <HomeContent />
    </Suspense>
  );
}
