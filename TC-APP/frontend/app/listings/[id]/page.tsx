'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

// Types (Duplicate from page.tsx for now, ideally should be in a shared types file)
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

export default function ListingDetail() {
    const { data: session } = useSession();
    const params = useParams();
    const id = params.id as string;

    const [listing, setListing] = useState<ListingItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        const fetchListing = async () => {
            if (!id) return;

            try {
                const response = await fetch(`/api/proxy/market/listings/${id}`);
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Listing not found');
                    }
                    throw new Error('Failed to fetch listing');
                }
                const data = await response.json();
                setListing(data);
                if (data.images && data.images.length > 0) {
                    setSelectedImage(data.images[0]);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchListing();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error || !listing) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="text-red-500 text-xl font-semibold mb-4">Error: {error || 'Listing not found'}</div>
                <Link href="/" className="text-blue-600 hover:underline">
                    Back to Market
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <nav className="mb-8">
                    <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium flex items-center">
                        ← Back to Market
                    </Link>
                </nav>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="md:flex">
                        {/* Image Gallery Section */}
                        <div className="md:w-1/2 p-8 bg-gray-50">
                            <div className="mb-4 aspect-[2/3] relative rounded-lg overflow-hidden shadow-md bg-white">
                                {selectedImage ? (
                                    <img
                                        src={selectedImage}
                                        alt={listing.catalog.player_name}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x600?text=No+Image';
                                        }}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                                )}
                            </div>

                            {/* Thumbnails */}
                            {listing.images && listing.images.length > 1 && (
                                <div className="flex space-x-2 overflow-x-auto pb-2">
                                    {listing.images.map((img, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedImage(img)}
                                            className={`w-20 h-28 flex-shrink-0 rounded border-2 overflow-hidden ${selectedImage === img ? 'border-blue-500' : 'border-transparent'}`}
                                        >
                                            <img
                                                src={img}
                                                alt={`View ${index + 1}`}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/100x140?text=Thumb';
                                                }}
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Product Details Section */}
                        <div className="md:w-1/2 p-8">
                            <div className="mb-6">
                                <div className="flex items-center space-x-2 mb-2">
                                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                                        {listing.catalog.team}
                                    </span>
                                    {listing.catalog.is_rookie && (
                                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                                            Rookie Card
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.catalog.player_name}</h1>
                                <p className="text-xl text-gray-600">{listing.catalog.year} {listing.catalog.manufacturer} {listing.catalog.series_name}</p>
                                <p className="text-gray-500">Card #{listing.catalog.card_number}</p>
                            </div>

                            <div className="border-t border-gray-200 py-6">
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Condition</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Graded</p>
                                        <p className="font-medium">{listing.condition_grading.is_graded ? 'Yes' : 'No'}</p>
                                    </div>
                                    {listing.condition_grading.is_graded && (
                                        <>
                                            <div>
                                                <p className="text-sm text-gray-500">Service</p>
                                                <p className="font-medium">{listing.condition_grading.service}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Score</p>
                                                <p className="font-medium text-lg text-blue-600">{listing.condition_grading.score}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Cert #</p>
                                                <p className="font-mono text-sm">{listing.condition_grading.certification_number}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-6 mt-auto">
                                <div className="flex items-end justify-between mb-6">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Price</p>
                                        <p className="text-4xl font-bold text-gray-900">¥{listing.price.toLocaleString()}</p>
                                    </div>
                                </div>

                                {session?.user?.id === listing.seller_id ? (
                                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                                        <p className="text-gray-700 font-medium">You are the seller of this item.</p>
                                        <button className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
                                            Edit Listing (Mock)
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Link
                                            href={`/checkout/${listing.id}`}
                                            className="block w-full bg-blue-600 text-white text-lg font-semibold py-4 rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-center"
                                        >
                                            Buy Now
                                        </Link>
                                        <p className="text-center text-sm text-gray-400 mt-4">
                                            Secure transaction via Stripe (Mock)
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
