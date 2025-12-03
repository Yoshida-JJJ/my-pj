'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function Header() {
    const { data: session } = useSession();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    return (
        <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto bg-brand-dark-light/80 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-2xl flex items-center gap-8 max-w-4xl w-full justify-between">
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
                    <Link
                        href="/sell"
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-dark rounded-full text-xs font-bold hover:bg-white transition-colors shadow-lg shadow-brand-gold/20"
                    >
                        <span>SELL</span>
                    </Link>

                    {/* User Profile / Mobile Menu Toggle */}
                    <div className="relative">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-platinum to-brand-platinum/50 overflow-hidden">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.user?.email || 'Guest'}`} alt="User" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="absolute top-full mt-4 left-4 right-4 bg-brand-dark-light/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl pointer-events-auto md:hidden flex flex-col gap-2 animate-fade-in-up">
                    <Link href="/market" className="p-3 rounded-xl hover:bg-white/5 text-brand-platinum font-bold text-sm">MARKETPLACE</Link>
                    <Link href="/collection" className="p-3 rounded-xl hover:bg-white/5 text-brand-platinum font-bold text-sm">MY COLLECTION</Link>
                    <Link href="/auctions" className="p-3 rounded-xl hover:bg-white/5 text-brand-platinum font-bold text-sm">AUCTIONS</Link>
                    <Link href="/sell" className="p-3 rounded-xl bg-brand-gold/10 text-brand-gold font-bold text-sm text-center border border-brand-gold/20">START SELLING</Link>
                    {session ? (
                        <button onClick={() => signOut()} className="p-3 rounded-xl bg-red-500/10 text-red-400 font-bold text-sm text-center border border-red-500/20 mt-2">LOGOUT</button>
                    ) : (
                        <Link href="/login" className="p-3 rounded-xl bg-brand-blue/10 text-brand-blue font-bold text-sm text-center border border-brand-blue/20 mt-2">LOGIN</Link>
                    )}
                </div>
            )}
        </header>
    );
}
