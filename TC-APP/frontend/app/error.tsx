'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-dark relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-blue/5 rounded-full blur-[100px]"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10 bg-center"></div>
            </div>

            <div className="relative z-10 text-center px-4 max-w-lg mx-auto">
                <div className="mb-8 flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                </div>
                <h2 className="text-3xl font-heading font-bold text-white mb-4">System Malfunction</h2>
                <p className="text-brand-platinum/60 mb-8 text-lg">{error.message || "An unexpected error occurred within the stadium network."}</p>
                <button
                    onClick={() => reset()}
                    className="px-8 py-3 bg-brand-blue hover:bg-brand-blue-glow text-white font-bold rounded-full transition-all shadow-lg hover:shadow-brand-blue/30"
                >
                    Reboot System
                </button>
            </div>
        </div>
    );
}
