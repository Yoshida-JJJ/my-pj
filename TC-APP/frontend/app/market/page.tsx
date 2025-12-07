'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../utils/supabase/client';
import CardListing from '../../components/CardListing';
import Footer from '../../components/Footer';
import { ListingItem, Team } from '../../types';

export default function MarketPage() {
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
                    .select('*, catalog:card_catalogs!inner(*)')
                    .eq('status', 'Active'); // Only show Active listings in Marketplace

                if (debouncedSearch) {
                    // Search in catalog fields. Note: This requires the joined table to be filtered.
                    // Supabase JS client allows filtering on joined tables with dot notation if !inner is used.
                    // However, OR across multiple columns in joined table is tricky.
                    // For simplicity, let's search by player_name.
                    query = query.ilike('catalog.player_name', `%${debouncedSearch}%`);
                }

                if (selectedTeam) {
                    query = query.eq('catalog.team', selectedTeam);
                }

                if (sortOrder === 'newest') {
                    query = query.order('created_at', { ascending: false });
                } else if (sortOrder === 'price_asc') {
                    query = query.order('price', { ascending: true, nullsFirst: false });
                } else if (sortOrder === 'price_desc') {
                    query = query.order('price', { ascending: false, nullsFirst: false });
                }

                const { data, error } = await query;

                if (error) {
                    throw error;
                }

                // Transform data to match ListingItem type if necessary
                // The type definition expects catalog to be nested, which Supabase returns.
                setListings(data as any); // Type assertion might be needed depending on generated types
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 relative z-20 flex-1 w-full">
                <div className="mb-8">
                    <h1 className="text-4xl font-heading font-bold text-white mb-2">Marketplace</h1>
                    <p className="text-brand-platinum/60">Discover and trade premium baseball cards.</p>
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
                                    placeholder="Search player, series, or year..."
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
                                <option value="">All Teams</option>
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
                                <option value="newest">Newest</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Listings Grid */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-heading font-bold text-white">All Listings</h2>
                        <span className="text-brand-platinum/60 text-sm">{listings.length} items found</span>
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                                {listings.map((item) => (
                                    <CardListing key={item.id} item={item} />
                                ))}
                            </div>

                            {listings.length === 0 && (
                                <div className="text-center py-20 bg-brand-dark-light/30 rounded-2xl border border-brand-platinum/5">
                                    <p className="text-brand-platinum/50 text-lg">No listings found matching your criteria.</p>
                                    <button
                                        onClick={() => { setSearchQuery(''); setSelectedTeam(''); }}
                                        className="mt-4 text-brand-blue hover:text-brand-blue-glow font-medium"
                                    >
                                        Clear Filters
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
