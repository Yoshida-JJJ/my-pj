'use client';

import Footer from '../../components/Footer';

export default function AuctionsPage() {
    return (
        <div className="min-h-screen bg-brand-dark flex flex-col">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 relative z-20 flex-1 w-full text-center">
                <div className="glass-panel-premium p-12 rounded-2xl shadow-2xl inline-block max-w-2xl">
                    <div className="w-20 h-20 bg-brand-blue/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1槌3 10V3L4 14h7v7l9-11h-7z" />
                            {/* Using a gavel-like icon or generic lightning for now */}
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-heading font-bold text-white mb-4">オークション機能は近日公開</h1>
                    <p className="text-brand-platinum/60 text-lg mb-8">
                        レアカードをリアルタイムで入札できるオークション機能を準備中です。
                    </p>
                    <div className="inline-block px-6 py-3 rounded-full bg-brand-dark-light border border-brand-platinum/10 text-brand-platinum/40 text-sm font-mono">
                        公開予定: 2026年第1四半期
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
