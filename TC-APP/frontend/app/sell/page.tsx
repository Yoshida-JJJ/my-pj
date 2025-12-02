'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

// Types
type Manufacturer = "BBM" | "Calbee" | "Epoch" | "Topps_Japan";
type Team = "Giants" | "Tigers" | "Dragons" | "Swallows" | "Carp" | "BayStars" | "Hawks" | "Fighters" | "Marines" | "Buffaloes" | "Eagles" | "Lions";

interface CardCatalog {
    id: string;
    manufacturer: Manufacturer;
    year: number;
    series_name?: string;
    player_name: string;
    team: Team;
    card_number?: string;
    is_rookie: boolean;
}

export default function SellPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [catalogItems, setCatalogItems] = useState<CardCatalog[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState(true);

    // Form State
    const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
    const [selectedCatalog, setSelectedCatalog] = useState<CardCatalog | null>(null);
    const [price, setPrice] = useState<string>('');
    const [isGraded, setIsGraded] = useState(false);
    const [gradingService, setGradingService] = useState('PSA');
    const [gradingScore, setGradingScore] = useState<string>('10');
    const [certNumber, setCertNumber] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const response = await fetch('/api/proxy/catalog/cards');
                if (response.ok) {
                    const data = await response.json();
                    setCatalogItems(data);
                    if (data.length > 0) {
                        setSelectedCatalogId(data[0].id);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch catalog', err);
            } finally {
                setLoadingCatalog(false);
            }
        };
        fetchCatalog();
    }, []);

    // Update selectedCatalog object when selectedCatalogId changes
    useEffect(() => {
        const foundCatalog = catalogItems.find(item => item.id === selectedCatalogId);
        setSelectedCatalog(foundCatalog || null);
    }, [selectedCatalogId, catalogItems]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/proxy/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload image');
            }

            const data = await response.json();
            setImages(prev => [...prev, data.url]);
        } catch (err) {
            console.error(err);
            setError('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCatalog) {
            setError("Please select a card from the catalog.");
            return;
        }
        if (status === 'loading') { // Check if session is still loading
            setError("Session is still loading. Please wait.");
            return;
        }
        if (!session?.user?.id) {
            setError("You must be logged in to sell items.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // 1. Create Draft Listing
            const createRes = await fetch('/api/proxy/market/listings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    catalog_id: selectedCatalog.id, // Changed to selectedCatalog.id
                    price: parseInt(price),
                    images: images, // Kept existing images array
                    condition_grading: {
                        is_graded: isGraded,
                        service: isGraded ? gradingService : "None", // Kept existing logic for service
                        score: isGraded ? parseFloat(gradingScore) : null, // Kept existing logic for score
                        certification_number: isGraded ? certNumber : null // Kept existing logic for certNumber
                    },
                    seller_id: session.user.id // Changed to session.user.id
                })
            });

            if (!createRes.ok) {
                const errData = await createRes.json();
                throw new Error(errData.detail || 'Failed to create listing');
            }

            const listing = await createRes.json();

            // 2. Publish Listing
            const publishRes = await fetch(`/api/proxy/market/listings/${listing.id}/publish`, {
                method: 'POST'
            });

            if (!publishRes.ok) {
                throw new Error('Failed to publish listing');
            }

            // 3. Redirect
            router.push(`/listings/${listing.id}`);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                            Create New Listing
                        </h2>
                    </div>
                </div>

                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">

                        {/* Catalog Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Select Card</label>
                            {loadingCatalog ? (
                                <p className="text-sm text-gray-500">Loading catalog...</p>
                            ) : (
                                <select
                                    value={selectedCatalogId}
                                    onChange={(e) => setSelectedCatalogId(e.target.value)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border relative z-10 text-gray-900"
                                >
                                    {catalogItems.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.player_name} - {item.year} {item.manufacturer} ({item.card_number})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Price (JPY)</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                                    <span className="text-gray-500 sm:text-sm">¥</span>
                                </div>
                                <input
                                    type="number"
                                    min="100"
                                    required
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md border py-2 relative z-10 text-gray-900"
                                    placeholder="5000"
                                />
                            </div>
                        </div>

                        {/* Condition */}
                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex items-center mb-4">
                                <input
                                    id="is_graded"
                                    type="checkbox"
                                    checked={isGraded}
                                    onChange={(e) => setIsGraded(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="is_graded" className="ml-2 block text-sm text-gray-900">
                                    Is this card graded?
                                </label>
                            </div>

                            {isGraded && (
                                <div className="grid grid-cols-2 gap-4 pl-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Service</label>
                                        <select
                                            value={gradingService}
                                            onChange={(e) => setGradingService(e.target.value)}
                                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                        >
                                            <option>PSA</option>
                                            <option>BGS</option>
                                            <option>CGC</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Score</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            value={gradingScore}
                                            onChange={(e) => setGradingScore(e.target.value)}
                                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3 text-gray-900"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Certification Number</label>
                                        <input
                                            type="text"
                                            value={certNumber}
                                            onChange={(e) => setCertNumber(e.target.value)}
                                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3 text-gray-900"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Images */}
                        <div className="border-t border-gray-200 pt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>

                            {/* Upload Button */}
                            <div className="mb-4">
                                <label className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {uploading ? 'Uploading...' : 'Upload Image'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>

                            {/* Preview */}
                            <div className="grid grid-cols-2 gap-4">
                                {images.map((url, idx) => (
                                    <div key={idx} className="relative group">
                                        <img
                                            src={url}
                                            alt={`Uploaded ${idx + 1}`}
                                            className="h-40 w-full object-cover rounded-md"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setImages(images.filter((_, i) => i !== idx))}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {images.length === 0 && (
                                <p className="text-sm text-gray-500">No images uploaded yet.</p>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="rounded-md bg-red-50 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">Error</h3>
                                        <div className="mt-2 text-sm text-red-700">
                                            <p>{error}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={submitting}
                                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {submitting ? 'Listing...' : 'List Item'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
