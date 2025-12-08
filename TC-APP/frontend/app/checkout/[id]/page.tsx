'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../utils/supabase/client';

// Types (Duplicate from page.tsx for now)
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

export default function CheckoutPage() {
    const [user, setUser] = useState<any>(null);
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [listing, setListing] = useState<ListingItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [shippingAddress, setShippingAddress] = useState('');

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
                    const addressParts = [
                        profile.postal_code ? `〒${profile.postal_code}` : '',
                        profile.address_line1,
                        profile.address_line2,
                        profile.phone_number ? `Tel: ${profile.phone_number}` : ''
                    ].filter(Boolean).join('\n');

                    setShippingAddress(addressParts);
                }
            }

            if (!id) return;

            try {
                const { data, error } = await supabase
                    .from('listing_items')
                    .select('*, catalog:card_catalogs(*)')
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

        if (!shippingAddress.trim()) {
            setError('Please enter a shipping address.');
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            const supabase = createClient();

            // Call the secure RPC function
            const { data: orderId, error: rpcError } = await supabase
                .rpc('purchase_item', {
                    p_listing_id: listing.id,
                    p_buyer_id: user.id,
                    p_total_amount: listing.price,
                    p_payment_method_id: 'stripe_mock', // Mock payment method ID
                    p_shipping_address: shippingAddress
                });

            if (rpcError) {
                throw rpcError;
            }

            // Redirect to Success Page
            router.push(`/orders/${orderId}/success`);

        } catch (err: any) {
            console.error('Purchase Error:', err);
            // Supabase errors are not always Error instances
            const errorMessage = err?.message || err?.error_description || 'Transaction failed';
            setError(errorMessage);
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error && !listing) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="text-red-500 text-xl font-semibold mb-4">Error: {error}</div>
                <Link href="/" className="text-blue-600 hover:underline">
                    Back to Market
                </Link>
            </div>
        );
    }

    if (!listing) return null;

    return (
        <div className="min-h-screen pt-32 pb-48 px-4 sm:px-6 lg:px-8 bg-brand-dark overflow-y-auto">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-heading font-bold text-white mb-8">Checkout</h1>

                <div className="glass-panel-premium shadow-2xl rounded-2xl mb-6">
                    <div className="px-6 py-5 border-b border-brand-platinum/10">
                        <h3 className="text-lg leading-6 font-medium text-white">Order Summary</h3>
                    </div>
                    <div className="border-t border-brand-platinum/10">
                        <dl>
                            <div className="bg-brand-dark-light/30 px-6 py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt className="text-sm font-medium text-brand-platinum">Item</dt>
                                <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2">
                                    {listing.catalog.player_name} ({listing.catalog.year} {listing.catalog.manufacturer})
                                </dd>
                            </div>
                            <div className="bg-transparent px-6 py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt className="text-sm font-medium text-brand-platinum">Condition</dt>
                                <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2">
                                    {listing.condition_grading.is_graded ? `Graded: ${listing.condition_grading.service} ${listing.condition_grading.score}` : 'Ungraded'}
                                </dd>
                            </div>
                            <div className="bg-brand-dark-light/30 px-6 py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt className="text-sm font-medium text-brand-platinum">Total Amount</dt>
                                <dd className="mt-1 text-xl font-bold text-brand-blue-glow sm:mt-0 sm:col-span-2">
                                    ¥{listing.price.toLocaleString()}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {/* Shipping Address Section */}
                <div className="glass-panel-premium shadow-2xl rounded-2xl mb-6 p-6">
                    <h3 className="text-lg leading-6 font-medium text-white mb-4">Shipping Address</h3>
                    <div className="mb-4">
                        <label htmlFor="address" className="block text-sm font-medium text-brand-platinum/60 mb-2">
                            Confirm or edit your shipping address:
                        </label>
                        <textarea
                            id="address"
                            rows={4}
                            value={shippingAddress}
                            onChange={(e) => setShippingAddress(e.target.value)}
                            className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-blue transition-colors"
                            placeholder="Enter your full shipping address here..."
                        />
                        {!shippingAddress && (
                            <p className="mt-2 text-sm text-brand-gold">
                                * Please enter a shipping address to proceed. You can save this in your profile for future purchases.
                            </p>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 mb-6 rounded-xl">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-4">
                    <Link href={`/listings/${listing.id}`} className="px-6 py-3 border border-brand-platinum/20 rounded-xl text-sm font-medium text-brand-platinum hover:bg-brand-platinum/10 hover:text-white transition-all">
                        Cancel
                    </Link>
                    <button
                        onClick={handlePlaceOrder}
                        disabled={processing || !shippingAddress.trim()}
                        className={`inline-flex justify-center px-6 py-3 border border-transparent shadow-lg text-sm font-medium rounded-xl text-white bg-brand-blue hover:bg-brand-blue-glow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-all transform hover:scale-[1.02] ${processing || !shippingAddress.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {processing ? 'Processing...' : 'Confirm Purchase'}
                    </button>
                </div>
            </div>
        </div>
    );
}
