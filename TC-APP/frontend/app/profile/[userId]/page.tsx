'use client';

import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useParams, useSearchParams } from 'next/navigation';
import ShowcaseCard from '@/components/ShowcaseCard';
import SkeletonCard from '@/components/SkeletonCard';
import Image from 'next/image';
import Footer from '../../../components/Footer';

function ProfilePageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const isDebugLive = searchParams.get('live') === 'true'; // Debug Mode

    const userId = params.userId as string;
    const [profile, setProfile] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'showcase' | 'selling'>('showcase');
    const [displayItems, setDisplayItems] = useState<any[]>([]);
    const [activeItems, setActiveItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return;
            setLoading(true);
            const supabase = createClient();

            try {
                // Fetch Profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (profileError) throw profileError;
                setProfile(profileData);

                // Fetch Public Items (Display & Active)
                const { data: itemsData, error: itemsError } = await supabase
                    .from('listing_items')
                    .select('*')
                    .eq('seller_id', userId)
                    .in('status', ['Display', 'Active']);

                if (itemsError) throw itemsError;

                // Split items by status
                const display = itemsData?.filter(item => item.status === 'Display') || [];
                const active = itemsData?.filter(item => item.status === 'Active') || [];

                setDisplayItems(display);
                setActiveItems(active);

            } catch (error) {
                console.error('Failed to fetch profile data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId]);

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            alert('Profile URL copied to clipboard!');
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-32 pb-12 px-4 sm:px-6 lg:px-8 bg-brand-dark relative overflow-hidden">
                <div className="max-w-6xl mx-auto relative z-10">
                    {/* Header Skeleton */}
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-8 mb-12 p-8 rounded-2xl bg-white/5 border border-white/10 animate-pulse">
                        <div className="w-32 h-32 rounded-full bg-brand-platinum/10"></div>
                        <div className="flex-1 w-full space-y-4">
                            <div className="h-8 bg-brand-platinum/10 rounded w-1/2 mx-auto md:mx-0"></div>
                            <div className="h-4 bg-brand-platinum/10 rounded w-1/3 mx-auto md:mx-0"></div>
                        </div>
                    </div>
                    {/* Grid Skeleton */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
                        {[...Array(5)].map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white">
                User not found.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-brand-blue/10 to-transparent pointer-events-none"></div>
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12 relative z-10">
                {/* Profile Header */}
                <div className="flex flex-col md:flex-row items-center md:items-end gap-8 mb-12 p-8 rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-md relative overflow-hidden group">
                    {/* Header Background Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/10 via-transparent to-brand-gold/5 opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>

                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-brand-gold/50 shadow-[0_0_20px_rgba(234,179,8,0.3)] relative z-10 bg-brand-dark">
                            {profile.avatar_url ? (
                                <Image
                                    src={profile.avatar_url}
                                    alt={profile.name}
                                    fill
                                    sizes="128px"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-brand-platinum/10 flex items-center justify-center text-brand-platinum/40">
                                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                            )}
                        </div>
                        {/* Avatar Glow */}
                        <div className="absolute inset-0 rounded-full bg-brand-gold/20 blur-xl -z-10 scale-110"></div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 text-center md:text-left z-10">
                        <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-2 tracking-tight drop-shadow-lg">
                            {profile.name || 'Anonymous User'}
                        </h1>
                        <div className="flex items-center justify-center md:justify-start gap-4 text-brand-platinum/80 text-sm font-mono">
                            <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Member since {new Date(profile.created_at).getFullYear()}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-brand-platinum/40"></span>
                            <span className="flex items-center gap-1 text-brand-gold">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                {displayItems.length} Items Displayed
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="z-10">
                        <button
                            onClick={handleShare}
                            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full transition-all font-bold text-sm flex items-center gap-2 backdrop-blur-sm group/btn"
                        >
                            <svg className="w-5 h-5 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                            Share Profile
                        </button>
                    </div>
                </div>

                {/* Tabs & Content */}
                <div className="glass-panel-premium shadow-2xl overflow-hidden rounded-2xl border border-white/10">
                    <div className="border-b border-brand-platinum/10">
                        <nav className="-mb-px flex" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('showcase')}
                                className={`${activeTab === 'showcase'
                                    ? 'border-brand-blue text-brand-blue-glow bg-brand-blue/5'
                                    : 'border-transparent text-brand-platinum/60 hover:text-brand-platinum hover:border-brand-platinum/30 hover:bg-white/5'
                                    } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-all`}
                            >
                                Showcase ({displayItems.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('selling')}
                                className={`${activeTab === 'selling'
                                    ? 'border-brand-blue text-brand-blue-glow bg-brand-blue/5'
                                    : 'border-transparent text-brand-platinum/60 hover:text-brand-platinum hover:border-brand-platinum/30 hover:bg-white/5'
                                    } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-all`}
                            >
                                For Sale ({activeItems.length})
                            </button>
                        </nav>
                    </div>

                    <div className="p-6 min-h-[400px]">
                        {activeTab === 'showcase' && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
                                {displayItems.map((item, idx) => (
                                    <ShowcaseCard
                                        key={idx}
                                        item={item}
                                        is_live_moment={item.is_live_moment || isDebugLive}
                                    // No action props passed, so buttons will be hidden
                                    />
                                ))}
                                {displayItems.length === 0 && (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-brand-platinum/50 border-2 border-dashed border-brand-platinum/10 rounded-xl">
                                        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                        <p className="font-bold text-lg">No items in Showcase</p>
                                        <p className="text-sm mt-1 opacity-70">This user hasn't displayed any items yet.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'selling' && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
                                {activeItems.map((item, idx) => (
                                    <ShowcaseCard
                                        key={idx}
                                        item={item}
                                        is_live_moment={item.is_live_moment || isDebugLive}
                                    // No action props passed, so buttons will be hidden
                                    />
                                ))}
                                {activeItems.length === 0 && (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-brand-platinum/50 border-2 border-dashed border-brand-platinum/10 rounded-xl">
                                        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                        <p className="font-bold text-lg">No items for sale</p>
                                        <p className="text-sm mt-1 opacity-70">This user has no active listings.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-brand-dark flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div></div>}>
            <ProfilePageContent />
        </Suspense>
    );
}
