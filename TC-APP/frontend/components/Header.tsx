'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Header() {
    const { data: session } = useSession();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 w-full z-50 glass-panel border-b border-brand-platinum/10 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20 items-center">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center gap-2 group">
                            <span className="font-heading text-2xl font-bold tracking-tighter text-white group-hover:text-glow transition-all">
                                TC<span className="text-brand-blue">.APP</span>
                            </span>
                        </Link>
                        <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
                            <Link
                                href="/"
                                className="text-brand-platinum hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/5"
                            >
                                Market
                            </Link>
                            <Link
                                href="/sell"
                                className="text-brand-platinum hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/5"
                            >
                                Sell
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-4">
                            {session ? (
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-brand-platinum hidden md:block">
                                        {session.user?.email}
                                    </span>
                                    <Link
                                        href="/mypage"
                                        className="text-sm font-medium text-brand-platinum hover:text-white transition-colors"
                                    >
                                        My Page
                                    </Link>
                                    <button
                                        onClick={() => signOut()}
                                        className="text-sm font-medium text-brand-platinum hover:text-brand-blue transition-colors"
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    href="/login"
                                    className="px-6 py-2 bg-brand-blue hover:bg-brand-blue-glow text-white text-sm font-bold rounded-full transition-all shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/40 hover:scale-105"
                                >
                                    Login
                                </Link>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <div className="flex items-center sm:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-brand-platinum hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-blue"
                            >
                                <span className="sr-only">Open main menu</span>
                                {!isMobileMenuOpen ? (
                                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                ) : (
                                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isMobileMenuOpen && (
                <div className="sm:hidden glass-panel border-t border-brand-platinum/10 animate-fade-in-up">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        <Link
                            href="/"
                            className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white/10 hover:text-brand-blue"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Market
                        </Link>
                        <Link
                            href="/sell"
                            className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white/10 hover:text-brand-blue"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Sell
                        </Link>
                        {session ? (
                            <>
                                <Link
                                    href="/mypage"
                                    className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white/10 hover:text-brand-blue"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    My Page
                                </Link>
                                <button
                                    onClick={() => {
                                        signOut();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-brand-platinum hover:bg-white/10 hover:text-brand-blue"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="block px-3 py-2 rounded-md text-base font-medium text-brand-blue hover:bg-white/10"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
