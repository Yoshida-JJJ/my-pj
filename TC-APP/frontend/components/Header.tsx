'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../utils/supabase/client';

export default function Header() {
    const [user, setUser] = useState<any>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        router.push('/');
        router.refresh();
    };

    return (
        <header className="fixed top-4 md:top-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="pointer-events-auto bg-brand-dark-light/95 backdrop-blur-xl border border-white/10 rounded-full px-4 py-3 shadow-2xl flex items-center justify-between w-[92vw] md:w-full md:max-w-4xl gap-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-brand-blue-glow flex items-center justify-center shadow-lg shadow-brand-blue/20 group-hover:shadow-brand-blue/40 transition-all">
                        <span className="font-heading font-bold text-white text-sm">TC</span>
                    </div>
                    <span className="font-heading font-bold text-lg text-white tracking-tight hidden md:block">
                        TC APP
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {[
                        { name: 'MARKETPLACE', path: '/market' },
                        { name: 'MY COLLECTION', path: '/collection' },
                        { name: 'AUCTIONS', path: '/auctions' },
                        { name: 'COMMUNITY', path: '/community' },
                    ].map((item) => (
                        <Link
                            key={item.name}
                            href={item.path}
                            className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest transition-all ${pathname === item.path
                                ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                                : 'text-brand-platinum/60 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {user && (
                        <Link
                            href="/sell"
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-dark rounded-full text-xs font-bold hover:bg-white transition-colors shadow-lg shadow-brand-gold/20"
                        >
                            <span>SELL</span>
                        </Link>
                    )}

                    {/* User Profile / Mobile Menu Toggle */}
                    <div className="relative group">
                        <button
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-platinum to-brand-platinum/50 overflow-hidden relative">
                                <Image
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Guest'}`}
                                    alt="User"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </button>

                        {/* Dropdown Menu (Desktop) */}
                        <div className="absolute top-full right-0 mt-2 w-48 bg-brand-dark-light/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
                            <div className="p-2 space-y-1">
                                {user ? (
                                    <>
                                        <div className="px-3 py-2 text-xs text-brand-platinum/60 border-b border-white/5 mb-1">
                                            Signed in as<br />
                                            <span className="text-white font-bold truncate block">{user.email}</span>
                                        </div>
                                        <Link href="/profile" className="block px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-brand-platinum hover:text-white transition-colors">
                                            Profile
                                        </Link>
                                        <Link href="/collection" className="block px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-brand-platinum hover:text-white transition-colors">
                                            My Collection
                                        </Link>
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            Sign out
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/login" className="block px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-brand-platinum hover:text-white transition-colors">
                                            Sign in
                                        </Link>
                                        <Link href="/register" className="block px-3 py-2 rounded-lg hover:bg-brand-blue/10 text-sm text-brand-blue hover:text-brand-blue-glow transition-colors">
                                            Register
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile Menu Toggle (Visible on Mobile only) */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                    >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="absolute top-full mt-4 left-4 right-4 bg-brand-dark-light/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl pointer-events-auto md:hidden flex flex-col gap-2 animate-fade-in-up">
                    <Link href="/market" onClick={() => setIsMobileMenuOpen(false)} className="p-3 rounded-xl hover:bg-white/5 text-brand-platinum font-bold text-sm">MARKETPLACE</Link>
                    <Link href="/collection" onClick={() => setIsMobileMenuOpen(false)} className="p-3 rounded-xl hover:bg-white/5 text-brand-platinum font-bold text-sm">MY COLLECTION</Link>
                    <Link href="/auctions" onClick={() => setIsMobileMenuOpen(false)} className="p-3 rounded-xl hover:bg-white/5 text-brand-platinum font-bold text-sm">AUCTIONS</Link>
                    {user && (
                        <>
                            <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="p-3 rounded-xl hover:bg-white/5 text-brand-platinum font-bold text-sm">MY PROFILE</Link>
                            <Link href="/sell" onClick={() => setIsMobileMenuOpen(false)} className="p-3 rounded-xl bg-brand-gold/10 text-brand-gold font-bold text-sm text-center border border-brand-gold/20">START SELLING</Link>
                        </>
                    )}
                    {user ? (
                        <button onClick={() => { handleSignOut(); setIsMobileMenuOpen(false); }} className="p-3 rounded-xl bg-red-500/10 text-red-400 font-bold text-sm text-center border border-red-500/20 mt-2">LOGOUT</button>
                    ) : (
                        <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="p-3 rounded-xl bg-brand-blue/10 text-brand-blue font-bold text-sm text-center border border-brand-blue/20 mt-2">LOGIN</Link>
                    )}
                </div>
            )}
        </header>
    );
}
