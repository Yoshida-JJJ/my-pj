'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '../../../components/Footer';
import { createClient } from '../../../utils/supabase/client';

// Types (Duplicate from page.tsx for now)
type Manufacturer = "BBM" | "Calbee" | "Epoch" | "Topps_Japan";
type Team = "Giants" | "Tigers" | "Dragons" | "Swallows" | "Carp" | "BayStars" | "Hawks" | "Fighters" | "Marines" | "Buffaloes" | "Eagles" | "Lions";
type Rarity = "Common" | "Rare" | "Super Rare" | "Parallel" | "Autograph" | "Patch";



interface ConditionGrading {
    is_graded: boolean;
    service: string;
    score?: number;
    certification_number?: string;
}

interface ListingItem {
    id: string;
    price: number;
    images: string[];
    condition_grading: ConditionGrading;
    seller_id: string;
    status: string;

    // Backfilled Fields
    player_name?: string | null;
    team?: string | null;
    year?: number | null;
    manufacturer?: string | null;
    series_name?: string | null;
    card_number?: string | null;
}

export default function CheckoutPage() {
    const [user, setUser] = useState<any>(null);
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [listing, setListing] = useState<ListingItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Detailed Shipping State
    const [shippingForm, setShippingForm] = useState({
        name: '',
        postalCode: '',
        address: '',
        phone: ''
    });

    useEffect(() => {
        const init = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                // Fetch profile for address
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    const fullName = profile.last_name && profile.first_name
                        ? `${profile.last_name} ${profile.first_name}`
                        : profile.name || '';

                    const fullAddress = [
                        profile.address_line1,
                        profile.address_line2
                    ].filter(Boolean).join(' ');

                    setShippingForm({
                        name: fullName,
                        postalCode: profile.postal_code || '',
                        address: fullAddress,
                        phone: profile.phone_number || ''
                    });
                }
            }

            if (!id) return;

            try {
                const { data, error } = await supabase
                    .from('listing_items')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setListing(data as any);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [id]);

    const handlePlaceOrder = async () => {
        if (!listing) return;
        if (!user) {
            router.push('/login');
            return;
        }

        // Validate Shipping Form
        if (!shippingForm.name.trim() || !shippingForm.address.trim() || !shippingForm.phone.trim()) {
            setError("Please fill in all shipping fields (Name, Address, Phone).");
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    listingId: listing.id,
                    returnUrl: window.location.origin,
                    shippingDetails: {
                        name: shippingForm.name,
                        postalCode: shippingForm.postalCode,
                        address: shippingForm.address,
                        phone: shippingForm.phone
                    }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Payment initialization failed');
            }

            const { url } = await response.json();

            // Redirect to Stripe Checkout
            window.location.href = url;

        } catch (err: any) {
            console.error('Purchase Error:', err);
            setError(err.message || 'Transaction failed');
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue"></div>
            </div>
        );
    }

    if (error && !listing) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-brand-dark">
                <div className="text-red-500 text-xl font-semibold mb-4">Error: {error}</div>
                <Link href="/" className="text-brand-blue hover:underline">
                    Back to Market
                </Link>
            </div>
        );
    }

    if (!listing) return null;

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col pt-32 pb-12">
            <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-heading font-bold text-white mb-8 text-center border-b border-white/10 pb-4">Checkout</h1>

                <div className="glass-panel-premium shadow-2xl rounded-2xl mb-6 overflow-hidden border border-brand-platinum/10">
                    <div className="bg-brand-dark-light/50 px-6 py-5 border-b border-brand-platinum/10">
                        <h3 className="text-lg leading-6 font-bold text-white">Order Summary</h3>
                    </div>
                    <div className="divide-y divide-white/5">
                        <div className="px-6 py-4 flex justify-between items-center group hover:bg-white/5 transition-colors">
                            <span className="text-sm font-medium text-brand-platinum">Item</span>
                            <span className="text-sm text-white font-bold group-hover:text-brand-blue-glow transition-colors">
                                {listing.player_name || 'Unknown Item'} <span className="text-brand-platinum/60 font-normal">({listing.year || '----'} {listing.manufacturer || ''})</span>
                            </span>
                        </div>
                        <div className="px-6 py-4 flex justify-between items-center">
                            <span className="text-sm font-medium text-brand-platinum">Condition</span>
                            <span className="text-sm text-white">
                                {listing.condition_grading.is_graded ? `Graded: ${listing.condition_grading.service} ${listing.condition_grading.score}` : 'Ungraded'}
                            </span>
                        </div>
                        <div className="px-6 py-5 flex justify-between items-center bg-brand-blue/5">
                            <span className="text-base font-bold text-white">Total Amount</span>
                            <span className="text-2xl font-bold text-brand-blue-glow font-heading tracking-tight">
                                ¥{listing.price.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Shipping Address Section */}
                <div className="glass-panel-premium shadow-2xl rounded-2xl mb-6 p-6 border border-brand-platinum/10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17h4V5H2v12h3m10 0h5v-3.5L15.5 8H10" /></svg>
                        </div>
                        <h3 className="text-lg leading-6 font-bold text-white">Shipping Address</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-brand-platinum/60 mb-1 uppercase tracking-wider">Name <span className="text-red-400">*</span></label>
                            <input
                                type="text"
                                className="w-full bg-brand-dark border border-brand-platinum/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-blue transition-colors placeholder-brand-platinum/20"
                                placeholder="Full Name"
                                value={shippingForm.name}
                                onChange={e => setShippingForm({ ...shippingForm, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className="block text-xs font-medium text-brand-platinum/60 mb-1 uppercase tracking-wider">Postal Code</label>
                                <input
                                    type="text"
                                    className="w-full bg-brand-dark border border-brand-platinum/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-blue transition-colors placeholder-brand-platinum/20"
                                    placeholder="123-4567"
                                    value={shippingForm.postalCode}
                                    onChange={e => setShippingForm({ ...shippingForm, postalCode: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-brand-platinum/60 mb-1 uppercase tracking-wider">Phone Number <span className="text-red-400">*</span></label>
                                <input
                                    type="tel"
                                    className="w-full bg-brand-dark border border-brand-platinum/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-blue transition-colors placeholder-brand-platinum/20"
                                    placeholder="090-1234-5678"
                                    value={shippingForm.phone}
                                    onChange={e => setShippingForm({ ...shippingForm, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-brand-platinum/60 mb-1 uppercase tracking-wider">Full Address <span className="text-red-400">*</span></label>
                            <input
                                type="text"
                                className="w-full bg-brand-dark border border-brand-platinum/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-blue transition-colors placeholder-brand-platinum/20"
                                placeholder="Prefecture, City, Street, Building"
                                value={shippingForm.address}
                                onChange={e => setShippingForm({ ...shippingForm, address: e.target.value })}
                            />
                        </div>

                        <div className="text-xs text-brand-platinum/40 italic mt-2">
                            * Updating this form does not change your main profile address.
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 mb-6 rounded-xl flex items-center gap-3 animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                        <p className="text-sm text-red-400 font-bold">{error}</p>
                    </div>
                )}

                <p className="text-xs text-brand-platinum/60 text-right mb-4 max-w-lg ml-auto leading-relaxed">
                    購入を確定すると、商品の発送に必要な範囲で、あなたの配送先情報が出品者に開示されます。
                </p>

                <div className="flex justify-end space-x-4">
                    <Link href={`/listings/${listing.id}`} className="px-6 py-3 border border-brand-platinum/20 rounded-xl text-sm font-bold text-brand-platinum hover:bg-brand-platinum/10 hover:text-white transition-all">
                        Cancel
                    </Link>
                    <button
                        onClick={handlePlaceOrder}
                        disabled={processing || !shippingForm.name.trim() || !shippingForm.address.trim() || !shippingForm.phone.trim()}
                        className={`inline-flex items-center gap-2 justify-center px-8 py-3 border border-transparent shadow-lg text-sm font-bold rounded-xl text-white bg-gradient-to-r from-brand-blue to-brand-blue-glow hover:from-brand-blue-glow hover:to-brand-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-all transform hover:scale-[1.02] shadow-brand-blue/20 ${processing || !shippingForm.name.trim() || !shippingForm.address.trim() || !shippingForm.phone.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {processing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Processing...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                                Buy Now
                            </>
                        )}
                    </button>
                </div>
            </div>
            <Footer />
        </div>
    );
}
