'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';
import Footer from '../../components/Footer';
import { CardCatalog } from '../../types';
import PremiumCardImage from '../../components/PremiumCardImage';

import { Suspense } from 'react';

function SellContent() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    const searchParams = useSearchParams();
    const source = searchParams.get('source');
    const sourceId = searchParams.get('id');
    const sourceType = searchParams.get('type'); // 'manual' or 'purchased'

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

    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const init = async () => {
            const supabase = createClient();

            // Fetch User
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                // Redirect to login if not authenticated
                // router.push('/login'); // Optional: enforce auth here or check on submit
            }
            setUser(user);

            // Fetch Catalog
            try {
                const { data, error } = await supabase
                    .from('card_catalogs')
                    .select('*');

                if (error) throw error;

                setCatalogItems(data as any);

                // If not pre-filling, default to first item
                if (data.length > 0 && !sourceId) {
                    setSelectedCatalogId(data[0].id);
                }
            } catch (err) {
                console.error('Failed to fetch catalog', err);
            } finally {
                setLoadingCatalog(false);
            }

            // Handle Pre-fill from Workspace
            if (source === 'collection' && sourceId && user) {
                try {
                    // Try to fetch from listing_items first (Drafts/Display)
                    const { data: listingData, error: listingError } = await supabase
                        .from('listing_items')
                        .select('*')
                        .eq('id', sourceId)
                        .single();

                    if (listingData) {
                        // It's an existing listing (Draft or Display)
                        setIsEditing(true);
                        setSelectedCatalogId(listingData.catalog_id);
                        setImages(listingData.images || []);
                        if (listingData.price) setPrice(listingData.price.toString());

                        if (listingData.condition_grading) {
                            setIsGraded(listingData.condition_grading.is_graded);
                            if (listingData.condition_grading.is_graded) {
                                setGradingService(listingData.condition_grading.service);
                                setGradingScore(listingData.condition_grading.score?.toString() || '10');
                                setCertNumber(listingData.condition_grading.certification_number || '');
                            }
                        }
                        return;
                    }

                    // Fallback for legacy user_collections (if any) or Orders
                    if (sourceType === 'manual') {
                        const { data: manualData, error: manualError } = await supabase
                            .from('user_collections')
                            .select('*')
                            .eq('id', sourceId)
                            .single();

                        if (manualError) throw manualError;
                        if (manualData) {
                            setSelectedCatalogId(manualData.catalog_id);
                            setImages(manualData.images || []);
                        }
                    } else if (sourceType === 'purchased') {
                        const { data: orderData, error: orderError } = await supabase
                            .from('orders')
                            .select('*, listing:listing_items(*)')
                            .eq('id', sourceId)
                            .single();

                        if (orderError) throw orderError;
                        if (orderData && orderData.listing) {
                            setSelectedCatalogId(orderData.listing.catalog_id);
                            setImages(orderData.listing.images || []);
                        }
                    }
                } catch (err) {
                    console.error("Failed to load source item", err);
                    setError("Failed to load item details from collection.");
                }
            }
        };
        init();
    }, [source, sourceId, sourceType]);

    // Update selectedCatalog object when selectedCatalogId changes
    useEffect(() => {
        const foundCatalog = catalogItems.find(item => item.id === selectedCatalogId);
        setSelectedCatalog(foundCatalog || null);
    }, [selectedCatalogId, catalogItems]);

    const [isDragging, setIsDragging] = useState(false);

    const uploadFile = async (file: File) => {
        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const supabase = createClient();
            const { error: uploadError } = await supabase.storage
                .from('card-images')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('card-images')
                .getPublicUrl(filePath);

            setImages(prev => [...prev, publicUrl]);
        } catch (err) {
            console.error(err);
            setError('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        await uploadFile(e.target.files[0]);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await uploadFile(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCatalog) {
            setError("Please select a card from the catalog.");
            return;
        }

        if (!user?.id) {
            setError("You must be logged in to sell items.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const supabase = createClient();

            let listingId;

            if (isEditing && sourceId) {
                // UPDATE existing listing (Draft -> Active)
                const { data: updatedListing, error: updateError } = await supabase
                    .from('listing_items')
                    .update({
                        catalog_id: selectedCatalog.id,
                        price: parseInt(price),
                        images: images,
                        condition_grading: {
                            is_graded: isGraded,
                            service: isGraded ? gradingService : "None",
                            score: isGraded ? parseFloat(gradingScore) : null,
                            certification_number: isGraded ? certNumber : null
                        },
                        status: 'Active'
                    })
                    .eq('id', sourceId)
                    .select()
                    .single();

                if (updateError) throw updateError;
                listingId = updatedListing.id;

            } else {
                // INSERT new listing
                const { data: listing, error: insertError } = await supabase
                    .from('listing_items')
                    .insert({
                        catalog_id: selectedCatalog.id,
                        price: parseInt(price),
                        images: images,
                        condition_grading: {
                            is_graded: isGraded,
                            service: isGraded ? gradingService : "None",
                            score: isGraded ? parseFloat(gradingScore) : null,
                            certification_number: isGraded ? certNumber : null
                        },
                        seller_id: user.id,
                        status: 'Active'
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;
                listingId = listing.id;

                // If source was 'manual' (legacy), delete the original collection item
                if (source === 'collection' && sourceType === 'manual' && sourceId) {
                    const { error: deleteError } = await supabase
                        .from('user_collections')
                        .delete()
                        .eq('id', sourceId);

                    if (deleteError) {
                        console.error("Failed to remove item from manual collection", deleteError);
                    }
                }
            }

            // Redirect
            router.push(`/listings/${listingId}`);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 relative z-20 flex-1 w-full">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-heading font-bold leading-7 text-white sm:text-4xl sm:truncate drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        Create New Listing
                    </h2>
                    <p className="mt-2 text-brand-platinum/60">List your card for sale in the premium marketplace.</p>
                </div>
            </div>

            <div className="glass-panel-premium rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-3xl -z-10"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl -z-10"></div>

                <form onSubmit={handleSubmit} className="p-8 space-y-10">

                    {/* Catalog Selection */}
                    <div>
                        <label className="block text-sm font-bold text-brand-gold tracking-wider mb-3 uppercase">Select Card from Catalog</label>
                        {loadingCatalog ? (
                            <div className="flex items-center gap-3 text-brand-platinum/50 animate-pulse p-4 bg-brand-dark-light/30 rounded-xl border border-brand-platinum/5">
                                <div className="w-5 h-5 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                                <span>Loading catalog...</span>
                            </div>
                        ) : (
                            <div className="relative group">
                                <select
                                    value={selectedCatalogId}
                                    onChange={(e) => setSelectedCatalogId(e.target.value)}
                                    className="block w-full py-4 px-5 rounded-xl bg-brand-dark-light/80 border border-brand-platinum/20 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold/50 transition-all appearance-none cursor-pointer hover:bg-brand-dark-light"
                                >
                                    {catalogItems.map((item) => (
                                        <option key={item.id} value={item.id} className="bg-brand-dark-light">
                                            {item.player_name} - {item.year} {item.manufacturer} ({item.card_number})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-brand-gold">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        )}
                        {selectedCatalog && (
                            <div className="mt-4 p-4 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex gap-4 items-center animate-fade-in-up">
                                <div className="w-12 h-12 rounded-lg bg-brand-blue/20 flex items-center justify-center text-brand-blue">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <p className="text-white font-bold">{selectedCatalog.player_name}</p>
                                    <p className="text-sm text-brand-platinum/70">{selectedCatalog.series_name} • {selectedCatalog.rarity}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Price */}
                    <div>
                        <label className="block text-sm font-bold text-brand-gold tracking-wider mb-3 uppercase">Listing Price (JPY)</label>
                        <div className="relative rounded-xl shadow-sm group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-20">
                                <span className="text-brand-platinum/50 sm:text-lg font-heading">¥</span>
                            </div>
                            <input
                                type="number"
                                min="100"
                                required
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="block w-full pl-10 pr-12 py-4 rounded-xl bg-brand-dark-light/80 border border-brand-platinum/20 text-white placeholder-brand-platinum/20 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold/50 transition-all font-heading text-lg tracking-wide"
                                placeholder="5000"
                            />
                        </div>
                    </div>

                    {/* Condition */}
                    <div className="border-t border-white/10 pt-8">
                        <div className="flex items-center mb-6 p-4 rounded-xl bg-brand-dark-light/30 border border-white/5 hover:bg-brand-dark-light/50 transition-colors cursor-pointer" onClick={() => setIsGraded(!isGraded)}>
                            <div className={`w-6 h-6 rounded border flex items-center justify-center mr-4 transition-all ${isGraded ? 'bg-brand-gold border-brand-gold' : 'border-brand-platinum/30'}`}>
                                {isGraded && <svg className="w-4 h-4 text-brand-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <div>
                                <span className="block text-white font-bold">Graded Card</span>
                                <span className="text-sm text-brand-platinum/60">Is this card professionally graded?</span>
                            </div>
                        </div>

                        {isGraded && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-2 animate-fade-in-up">
                                <div>
                                    <label className="block text-sm font-medium text-brand-platinum mb-2">Grading Service</label>
                                    <div className="relative">
                                        <select
                                            value={gradingService}
                                            onChange={(e) => setGradingService(e.target.value)}
                                            className="block w-full py-3 px-4 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all appearance-none"
                                        >
                                            <option className="bg-brand-dark">PSA</option>
                                            <option className="bg-brand-dark">BGS</option>
                                            <option className="bg-brand-dark">CGC</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-brand-platinum/50">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-platinum mb-2">Score (1-10)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        max="10"
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
                                        placeholder="e.g. 12345678"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Images */}
                    <div className="border-t border-white/10 pt-8">
                        <label className="block text-sm font-bold text-brand-gold tracking-wider mb-4 uppercase">Card Images</label>

                        {/* Upload Button */}
                        <div className="mb-6">
                            <label
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''
                                    } ${isDragging
                                        ? 'border-brand-gold bg-brand-gold/10 scale-[1.02]'
                                        : 'border-brand-platinum/20 hover:border-brand-gold/50 hover:bg-brand-gold/5'
                                    }`}
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className={`w-10 h-10 mb-3 transition-colors ${isDragging ? 'text-brand-gold' : 'text-brand-platinum/50 group-hover:text-brand-gold'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    <p className={`mb-2 text-sm ${isDragging ? 'text-white' : 'text-brand-platinum group-hover:text-white'}`}><span className="font-bold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-brand-platinum/50">PNG, JPG up to 10MB</p>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                />
                                {uploading && (
                                    <div className="absolute inset-0 bg-brand-dark/80 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-gold"></div>
                                    </div>
                                )}
                            </label>
                        </div>

                        {/* Preview */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {images.map((url, idx) => (
                                <div key={idx} className="relative group rounded-xl overflow-hidden border border-brand-platinum/10 aspect-[3/4]">
                                    <PremiumCardImage
                                        src={url}
                                        alt={`Uploaded ${idx + 1}`}
                                        className="w-full h-full"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => setImages(images.filter((_, i) => i !== idx))}
                                            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-transform hover:scale-110"
                                        >
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="rounded-xl bg-red-500/10 p-4 border border-red-500/20 animate-shake">
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-sm text-red-300 font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`w-full flex justify-center items-center gap-2 py-4 px-6 border border-transparent rounded-xl shadow-lg shadow-brand-blue/20 text-lg font-bold text-white bg-gradient-to-r from-brand-blue to-brand-blue-glow hover:from-brand-blue-glow hover:to-brand-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-all transform hover:scale-[1.02] ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {submitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Creating Listing...</span>
                                </>
                            ) : (
                                <>
                                    <span>List Item Now</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function SellPage() {
    return (
        <div className="min-h-screen bg-brand-dark flex flex-col">
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
                <SellContent />
            </Suspense>
            <Footer />
        </div>
    );
}
