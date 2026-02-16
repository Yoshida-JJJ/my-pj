'use client';

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-dark relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-blue/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-gold/5 rounded-full blur-[100px]"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10 bg-center"></div>
            </div>

            <div className="relative z-10 text-center px-4">
                <h1 className="text-9xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-br from-brand-platinum to-brand-dark-light opacity-50 mb-0 leading-none select-none">
                    404
                </h1>
                <div className="-mt-12 mb-8 relative">
                    <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4 drop-shadow-lg">
                        ページが見つかりません
                    </h2>
                    <p className="text-brand-platinum/60 max-w-md mx-auto text-lg mb-8">
                        お探しのカードが見つかりませんでした。
                    </p>
                </div>

                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-brand-blue hover:bg-brand-blue-glow text-white font-bold rounded-full transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-105"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    ホームへ戻る
                </Link>
            </div>
        </div>
    );
}
