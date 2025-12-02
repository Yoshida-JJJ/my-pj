'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Types based on API response
type Manufacturer = "BBM" | "Calbee" | "Epoch" | "Topps_Japan";
type Team = "Giants" | "Tigers" | "Dragons" | "Swallows" | "Carp" | "BayStars" | "Hawks" | "Fighters" | "Marines" | "Buffaloes" | "Eagles" | "Lions";
type Rarity = "Common" | "Rare" | "Super Rare" | "Parallel" | "Autograph" | "Patch";

interface CardCatalog {
  id: string;
  manufacturer: Manufacturer;
  year: number;
  series_name?: string;
  player_name: string;
  team: Team;
  card_number?: string;
  rarity?: Rarity;
  is_rookie: boolean;
}

interface ConditionGrading {
  is_graded: boolean;
  service: string;
  score?: number;
  certification_number?: string;
}

interface ListingItem {
  id: string;
  catalog_id: string;
  price: number;
  images: string[];
  condition_grading: ConditionGrading;
  seller_id: string;
  status: string;
  catalog: CardCatalog;
}

export default function Home() {
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
        const params = new URLSearchParams();
        if (debouncedSearch) params.append('q', debouncedSearch);
        if (selectedTeam) params.append('team', selectedTeam);
        if (sortOrder) params.append('sort', sortOrder);

        const response = await fetch(`http://localhost:8000/market/listings?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch listings');
        }
        const data = await response.json();
        setListings(data);
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
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Baseball Card Market</h1>
          <p className="mt-2 text-gray-600">Find your favorite rare cards.</p>
        </header>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-lg shadow mb-8 space-y-4 md:space-y-0 md:flex md:items-center md:space-x-4">
          {/* Search Input */}
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">Search</label>
            <input
              type="text"
              id="search"
              placeholder="Search player or series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 text-gray-900 relative z-10"
            />
          </div>

          {/* Team Filter */}
          <div className="w-full md:w-48">
            <label htmlFor="team" className="sr-only">Team</label>
            <select
              id="team"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 text-gray-900 relative z-10"
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 text-gray-900 relative z-10"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-red-500 text-xl font-semibold">Error: {error}</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {listings.map((item) => (
                <Link href={`/listings/${item.id}`} key={item.id} className="block group">
                  <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
                    {/* Image Section */}
                    <div className="relative h-64 bg-gray-200">
                      {item.images && item.images.length > 0 ? (
                        <img
                          src={item.images[0]}
                          alt={item.catalog.player_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            // Fallback for broken images
                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x600?text=No+Image';
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          No Image
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                        {item.catalog.year} {item.catalog.manufacturer}
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="mb-2">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 mb-1">
                          {item.catalog.team}
                        </span>
                        {item.catalog.is_rookie && (
                          <span className="inline-block ml-2 px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 mb-1">
                            RC
                          </span>
                        )}
                        <h2 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {item.catalog.player_name}
                        </h2>
                        <p className="text-sm text-gray-500">{item.catalog.series_name} {item.catalog.card_number}</p>
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Price</p>
                          <p className="text-xl font-bold text-gray-900">¥{item.price.toLocaleString()}</p>
                        </div>
                        <span className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
                          Buy Now
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {listings.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No listings found matching your criteria.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
