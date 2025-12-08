'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '../../../utils/supabase/client';
import Footer from '../../../components/Footer';
import { ListingItem } from '../../../types';

export default function ListingDetail() {
    const params = useParams();
    const id = params?.id as string;
    const [user, setUser] = useState<any>(null);
    const [listing, setListing] = useState<ListingItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        const fetchListingAndUser = async () => {
            const supabase = createClient();

            // Fetch User
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            // Use the id from the outer scope (useParams hook)
            if (!id) return;

            try {
                const { data, error } = await supabase
                    .from('listing_items')
                    .select('*, catalog:card_catalogs(*)')
                    .eq('id', id)
                    .single();

                if (error) {
                    throw error;
                }

                setListing(data as any);
                if (data.images && data.images.length > 0) {
                    setSelectedImage(data.images[0]);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchListingAndUser();
    }, [id]);

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

    return (
        <div className="min-h-screen bg-brand-dark pt-32 pb-32 px-4 sm:px-6 lg:px-8 flex flex-col">
            <div className="max-w-7xl mx-auto w-full flex-1">
                <nav className="mb-8">
                    <Link href="/" className="text-brand-platinum hover:text-white font-medium flex items-center transition-colors group">
                        <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Back to Market
                    </Link>
                </nav>

                <div className="glass-panel-premium rounded-2xl shadow-2xl overflow-hidden border border-white/10">
                    <div className="md:flex">
                        {/* Image Gallery Section */}
                        <div className="md:w-1/2 p-4 md:p-8 bg-brand-dark-light/50">
                            <div className="mb-6 aspect-[2/3] relative rounded-xl bg-brand-dark border border-brand-platinum/5 group perspective-[1000px]">
                                <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${selectedImage === listing.images[1] ? '[transform:rotateY(180deg)]' : ''}`}>
                                    {/* Front Image (Image 0) */}
                                    <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-xl overflow-hidden shadow-2xl">
                                        {listing.images && listing.images.length > 0 ? (
                                            <Image
                                                src={listing.images[0]}
                                                alt={listing.catalog.player_name}
                                                fill
                                                sizes="(max-width: 768px) 100vw, 50vw"
                                                className="object-contain p-2 md:p-4 bg-brand-dark-light/50"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-brand-platinum/30">No Image</div>
                                        )}
                                    </div>

                                    {/* Back Image (Image 1) */}
                                    {listing.images && listing.images.length > 1 && (
                                        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl overflow-hidden shadow-2xl bg-brand-dark-light/50">
                                            <Image
                                                src={listing.images[1]}
                                                alt={`${listing.catalog.player_name} Back`}
                                                fill
                                                sizes="(max-width: 768px) 100vw, 50vw"
                                                className="object-contain p-4"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Flip Button */}
                                {listing.images && listing.images.length > 1 && (
                                    <button
                                        onClick={() => setSelectedImage(selectedImage === listing.images[0] ? listing.images[1] : listing.images[0])}
                                        className="absolute bottom-4 right-4 z-20 p-3 rounded-full bg-black/60 text-white hover:bg-brand-blue hover:text-white transition-colors backdrop-blur-sm border border-white/10 shadow-lg"
                                        title="Flip Card"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                )}

                                {/* Glow Effect Behind Image */}
                                <div className="absolute inset-0 bg-brand-blue/5 blur-3xl -z-10"></div>
                            </div>

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
                                <div className="flex items-center space-x-3 mb-4">
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-blue/10 text-brand-blue border border-brand-blue/20 uppercase tracking-wider">
                                        {listing.catalog.team}
                                    </span>
                                    {listing.catalog.is_rookie && (
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-gold/10 text-brand-gold border border-brand-gold/20 uppercase tracking-wider animate-pulse-slow">
                                            Rookie Card
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-2 text-glow">{listing.catalog.player_name}</h1>
                                <p className="text-xl text-brand-platinum/80 font-light">{listing.catalog.year} {listing.catalog.manufacturer} {listing.catalog.series_name}</p>
                                <p className="text-brand-platinum/50 mt-2">Card #{listing.catalog.card_number}</p>
                            </div>

                            <div className="border-t border-brand-platinum/10 py-8">
                                <h3 className="text-sm font-bold text-brand-platinum/40 uppercase tracking-widest mb-6">Condition & Grading</h3>
                                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                    <div>
                                        <p className="text-xs text-brand-platinum/50 uppercase mb-1">Graded</p>
                                        <p className="font-medium text-white text-lg">{listing.condition_grading.is_graded ? 'Yes' : 'No'}</p>
                                    </div>
                                    {listing.condition_grading.is_graded && (
                                        <>
                                            <div>
                                                <p className="text-xs text-brand-platinum/50 uppercase mb-1">Service</p>
                                                <p className="font-medium text-white text-lg">{listing.condition_grading.service}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-brand-platinum/50 uppercase mb-1">Score</p>
                                                <p className="font-heading font-bold text-3xl text-brand-blue text-glow">{listing.condition_grading.score}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-brand-platinum/50 uppercase mb-1">Cert #</p>
                                                <p className="font-mono text-sm text-brand-platinum">{listing.condition_grading.certification_number}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-brand-platinum/10 pt-8 mt-auto">
                                <div className="flex items-end justify-between mb-8">
                                    <div>
                                        <p className="text-sm text-brand-platinum/50 uppercase tracking-wider mb-1">
                                            {listing.status === 'Display' ? 'Status' : 'Current Price'}
                                        </p>
                                        {listing.status === 'Display' ? (
                                            <span className="px-4 py-2 rounded-lg bg-brand-platinum/10 border border-brand-platinum/20 text-white font-bold tracking-wider">
                                                DISPLAY ONLY
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
                                        <p className="text-brand-platinum font-medium">You are the seller of this item.</p>
                                        <button className="mt-4 text-brand-blue hover:text-brand-blue-glow text-sm font-bold uppercase tracking-wider transition-colors">
                                            Edit Listing (Mock)
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
                                                    Buy Now
                                                </Link>
                                                <div className="flex items-center justify-center mt-6 gap-2 text-brand-platinum/40 text-sm">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                    Secure transaction via Stripe (Mock)
                                                </div>
                                            </>
                                        ) : (
                                            <div className="bg-brand-dark-light/30 p-6 rounded-xl text-center border border-brand-platinum/5">
                                                <p className="text-brand-platinum/60">
                                                    This item is {listing.status === 'Display' ? 'for display only' : 'not available for purchase'}.
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
        </div>
    );
}
