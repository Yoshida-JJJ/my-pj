'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Footer from '../../components/Footer';
import { CardCatalog } from '../../types';

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
        <div className="min-h-screen bg-brand-dark py-12 px-4 sm:px-6 lg:px-8 flex flex-col">
            <div className="max-w-3xl mx-auto w-full flex-1">
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-3xl font-heading font-bold leading-7 text-white sm:text-4xl sm:truncate text-glow">
                            Create New Listing
                        </h2>
                        <p className="mt-2 text-brand-platinum/60">List your card for sale in the marketplace.</p>
                    </div>
                </div>

                <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-brand-platinum/10">
                    <form onSubmit={handleSubmit} className="p-8 space-y-8">

                        {/* Catalog Selection */}
                        <div>
                            <label className="block text-sm font-medium text-brand-platinum mb-2">Select Card</label>
                            {loadingCatalog ? (
                                <p className="text-sm text-brand-platinum/50 animate-pulse">Loading catalog...</p>
                            ) : (
                                <select
                                    value={selectedCatalogId}
                                    onChange={(e) => setSelectedCatalogId(e.target.value)}
                                    className="block w-full py-3 px-4 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all appearance-none"
                                >
                                    {catalogItems.map((item) => (
                                        <option key={item.id} value={item.id} className="bg-brand-dark">
                                            {item.player_name} - {item.year} {item.manufacturer} ({item.card_number})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-sm font-medium text-brand-platinum mb-2">Price (JPY)</label>
                            <div className="relative rounded-xl shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20">
                                    <span className="text-brand-platinum/50 sm:text-sm">¥</span>
                                </div>
                                <input
                                    type="number"
                                    min="100"
                                    required
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="block w-full pl-8 pr-12 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white placeholder-brand-platinum/30 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                                    placeholder="5000"
                                />
                            </div>
                        </div>

                        {/* Condition */}
                        <div className="border-t border-brand-platinum/10 pt-8">
                            <div className="flex items-center mb-6">
                                <input
                                    id="is_graded"
                                    type="checkbox"
                                    checked={isGraded}
                                    onChange={(e) => setIsGraded(e.target.checked)}
                                    className="h-5 w-5 text-brand-blue focus:ring-brand-blue border-brand-platinum/20 rounded bg-brand-dark-light/50"
                                />
                                <label htmlFor="is_graded" className="ml-3 block text-sm font-medium text-white">
                                    Is this card graded?
                                </label>
                            </div>

                            {isGraded && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-8 animate-fade-in-up">
                                    <div>
                                        <label className="block text-sm font-medium text-brand-platinum mb-2">Service</label>
                                        <select
                                            value={gradingService}
                                            onChange={(e) => setGradingService(e.target.value)}
                                            className="block w-full py-3 px-4 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all appearance-none"
                                        >
                                            <option className="bg-brand-dark">PSA</option>
                                            <option className="bg-brand-dark">BGS</option>
                                            <option className="bg-brand-dark">CGC</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-brand-platinum mb-2">Score</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            value={gradingScore}
                                            onChange={(e) => setGradingScore(e.target.value)}
                                            className="block w-full py-3 px-4 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-brand-platinum mb-2">Certification Number</label>
                                        <input
                                            type="text"
                                            value={certNumber}
                                            onChange={(e) => setCertNumber(e.target.value)}
                                            className="block w-full py-3 px-4 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Images */}
                        <div className="border-t border-brand-platinum/10 pt-8">
                            <label className="block text-sm font-medium text-brand-platinum mb-4">Images</label>

                            {/* Upload Button */}
                            <div className="mb-6">
                                <label className={`inline-flex items-center px-6 py-3 border border-brand-platinum/20 text-sm font-medium rounded-xl shadow-sm text-white bg-brand-dark-light hover:bg-brand-dark-light/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue cursor-pointer transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <svg className="w-5 h-5 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
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
                                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-brand-platinum/10">
                                        <img
                                            src={url}
                                            alt={`Uploaded ${idx + 1}`}
                                            className="h-48 w-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setImages(images.filter((_, i) => i !== idx))}
                                            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {images.length === 0 && (
                                <div className="border-2 border-dashed border-brand-platinum/10 rounded-xl p-8 text-center">
                                    <p className="text-sm text-brand-platinum/40">No images uploaded yet.</p>
                                </div>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="rounded-xl bg-red-500/10 p-4 border border-red-500/20">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-400">Error</h3>
                                        <div className="mt-1 text-sm text-red-300/80">
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
                                className={`w-full flex justify-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-brand-blue hover:bg-brand-blue-glow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-all transform hover:scale-[1.02] ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {submitting ? 'Listing...' : 'List Item Now'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
}
