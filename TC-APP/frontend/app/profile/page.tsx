'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '../../utils/supabase/client';
import Link from 'next/link';
import Footer from '../../components/Footer';
// import { createClient } from '@/utils/supabase/client';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPostalCode, setEditPostalCode] = useState('');
    const [editAddressLine1, setEditAddressLine1] = useState('');
    const [editAddressLine2, setEditAddressLine2] = useState('');
    const [editPhoneNumber, setEditPhoneNumber] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchUserAndProfile = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            setUser(user);
            setEditEmail(user.email || '');

            // Fetch profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileData) {
                setProfile(profileData);
                setEditName(profileData.name || user.user_metadata?.name || '');
                setEditPostalCode(profileData.postal_code || '');
                setEditAddressLine1(profileData.address_line1 || '');
                setEditAddressLine2(profileData.address_line2 || '');
                setEditPhoneNumber(profileData.phone_number || '');
            } else {
                setEditName(user.user_metadata?.name || '');
            }

            setLoading(false);
        };

        fetchUserAndProfile();
    }, [router]);

    const handleSave = async () => {
        if (!user?.id) return;
        setSaving(true);
        try {
            const supabase = createClient();

            // Update Profile Table
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    name: editName,
                    email: user.email,
                    postal_code: editPostalCode,
                    address_line1: editAddressLine1,
                    address_line2: editAddressLine2,
                    phone_number: editPhoneNumber,
                });

            if (profileError) throw profileError;

            // Update Auth Metadata (optional, but good for consistency)
            const { error: authError } = await supabase.auth.updateUser({
                data: { name: editName },
                // email: editEmail // Updating email requires confirmation flow usually
            });

            if (authError) throw authError;

            setProfile({
                ...profile,
                name: editName,
                postal_code: editPostalCode,
                address_line1: editAddressLine1,
                address_line2: editAddressLine2,
                phone_number: editPhoneNumber
            });
            setIsEditing(false);
            alert('Profile updated successfully!');

        } catch (error) {
            console.error(error);
            alert('Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-dark flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue"></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col">
            <div className="flex-1 container mx-auto px-4 py-24 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto space-y-8">
                    {/* Header Section */}
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl font-heading font-bold text-white tracking-tight">
                            My Profile
                        </h1>
                        <p className="text-brand-platinum/60">
                            Manage your account settings and view your activity.
                        </p>
                    </div>

                    {/* Profile Card */}
                    <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-brand-platinum/10 relative overflow-hidden group">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-brand-blue/20 transition-all duration-700"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-start gap-8">
                            {/* Avatar */}
                            <div className="relative flex-shrink-0 mx-auto md:mx-0">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-blue to-brand-blue-glow p-[2px] shadow-lg shadow-brand-blue/20">
                                    <div className="w-full h-full rounded-full bg-brand-dark-light overflow-hidden">
                                        <img
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Guest'}`}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full border-4 border-brand-dark-light flex items-center justify-center" title="Active">
                                    <div className="w-full h-full rounded-full animate-pulse bg-green-400/50"></div>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-center md:text-left space-y-4 w-full">
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-brand-platinum/60 mb-1">Name</label>
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-blue"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-brand-platinum/60 mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={editEmail}
                                                    onChange={(e) => setEditEmail(e.target.value)}
                                                    disabled
                                                    className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-lg px-4 py-2 text-white/50 cursor-not-allowed focus:outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="border-t border-brand-platinum/10 pt-4 mt-4">
                                            <h3 className="text-white font-bold mb-3">Shipping Address</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-brand-platinum/60 mb-1">Postal Code</label>
                                                    <input
                                                        type="text"
                                                        value={editPostalCode}
                                                        onChange={(e) => setEditPostalCode(e.target.value)}
                                                        placeholder="123-4567"
                                                        className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-blue"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-brand-platinum/60 mb-1">Phone Number</label>
                                                    <input
                                                        type="tel"
                                                        value={editPhoneNumber}
                                                        onChange={(e) => setEditPhoneNumber(e.target.value)}
                                                        placeholder="090-1234-5678"
                                                        className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-blue"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-brand-platinum/60 mb-1">Address Line 1 (Prefecture, City)</label>
                                                <input
                                                    type="text"
                                                    value={editAddressLine1}
                                                    onChange={(e) => setEditAddressLine1(e.target.value)}
                                                    placeholder="Tokyo, Minato-ku"
                                                    className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-blue"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-brand-platinum/60 mb-1">Address Line 2 (Street, Building)</label>
                                                <input
                                                    type="text"
                                                    value={editAddressLine2}
                                                    onChange={(e) => setEditAddressLine2(e.target.value)}
                                                    placeholder="Roppongi 1-2-3, Hills Tower 4F"
                                                    className="w-full bg-brand-dark-light/50 border border-brand-platinum/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-blue"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-1">
                                            {editName || profile?.name || user?.user_metadata?.name || 'Trading Card Collector'}
                                        </h2>
                                        <p className="text-brand-platinum/60 font-mono text-sm mb-4">
                                            {editEmail || user?.email}
                                        </p>

                                        {(profile?.address_line1 || profile?.postal_code) && (
                                            <div className="bg-brand-dark-light/30 p-4 rounded-xl border border-brand-platinum/10 text-left">
                                                <h3 className="text-xs font-bold text-brand-platinum uppercase tracking-wider mb-2">Shipping Address</h3>
                                                <p className="text-white text-sm">
                                                    〒{profile.postal_code}<br />
                                                    {profile.address_line1}<br />
                                                    {profile.address_line2}<br />
                                                    {profile.phone_number && <span className="text-brand-platinum/60 mt-1 block">{profile.phone_number}</span>}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!isEditing && (
                                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                        <span className="px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold border border-brand-blue/20">
                                            MEMBER
                                        </span>
                                        <span className="px-3 py-1 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-bold border border-brand-gold/20">
                                            EARLY ADOPTER
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 w-full md:w-auto">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-6 py-2 rounded-xl bg-brand-blue hover:bg-brand-blue-glow text-white font-bold text-sm shadow-lg shadow-brand-blue/20 transition-all text-center disabled:opacity-50"
                                        >
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            disabled={saving}
                                            className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/10 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/10 transition-all"
                                        >
                                            Edit Profile
                                        </button>
                                        <Link href="/collection" className="px-6 py-2 rounded-xl bg-brand-blue hover:bg-brand-blue-glow text-white font-bold text-sm shadow-lg shadow-brand-blue/20 transition-all text-center">
                                            My Collection
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Total Listings', value: '0', icon: '📋' },
                            { label: 'Sales', value: '¥0', icon: '💰' },
                            { label: 'Purchases', value: '0', icon: '🛍️' },
                        ].map((stat, i) => (
                            <div key={i} className="glass-panel p-6 rounded-2xl border border-brand-platinum/5 hover:border-brand-platinum/20 transition-all group">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-brand-platinum/60 text-sm font-bold">{stat.label}</span>
                                    <span className="text-xl group-hover:scale-110 transition-transform">{stat.icon}</span>
                                </div>
                                <div className="text-2xl font-heading font-bold text-white group-hover:text-brand-blue-glow transition-colors">
                                    {stat.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
