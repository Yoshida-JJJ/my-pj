'use client';

import { useEffect, useState } from 'react';

interface PurchaseAnimationProps {
    onComplete: () => void;
}

export default function PurchaseAnimation({ onComplete }: PurchaseAnimationProps) {
    const [stage, setStage] = useState<'start' | 'flash' | 'reveal' | 'end'>('start');

    useEffect(() => {
        // Sequence of animation
        const timer1 = setTimeout(() => setStage('flash'), 500);
        const timer2 = setTimeout(() => setStage('reveal'), 1500);
        const timer3 = setTimeout(() => setStage('end'), 4000);
        const timer4 = setTimeout(onComplete, 4500);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            clearTimeout(timer4);
        };
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl">
            {/* Background Rays */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${stage === 'start' ? 'opacity-0' : 'opacity-100'}`}>
                <div className="w-[200vw] h-[200vw] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,215,0,0.1)_20deg,transparent_40deg,rgba(255,215,0,0.1)_60deg,transparent_80deg,rgba(255,215,0,0.1)_100deg,transparent_120deg,rgba(255,215,0,0.1)_140deg,transparent_160deg,rgba(255,215,0,0.1)_180deg,transparent_200deg,rgba(255,215,0,0.1)_220deg,transparent_240deg,rgba(255,215,0,0.1)_260deg,transparent_280deg,rgba(255,215,0,0.1)_300deg,transparent_320deg,rgba(255,215,0,0.1)_340deg,transparent_360deg)] animate-[spin_20s_linear_infinite]"></div>
            </div>

            {/* Flash Effect */}
            <div className={`absolute inset-0 bg-white transition-opacity duration-300 pointer-events-none ${stage === 'flash' ? 'opacity-80' : 'opacity-0'}`}></div>

            {/* Content */}
            <div className={`relative flex flex-col items-center transform transition-all duration-1000 ${stage === 'reveal' ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                <div className="text-6xl mb-8 animate-bounce">🎉</div>
                <h2 className="text-4xl md:text-6xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-white to-brand-gold animate-pulse text-center">
                    ORDER COMPLETED!
                </h2>
                <p className="mt-4 text-brand-platinum text-xl text-center max-w-md">
                    Congratulations! You have successfully received your item.
                </p>

                {/* Particles/Confetti (Simplified CSS) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="absolute top-1/2 left-1/2 w-2 h-2 bg-brand-gold rounded-full animate-ping" style={{
                            animationDelay: `${i * 0.1}s`,
                            transform: `rotate(${i * 30}deg) translate(100px)`
                        }}></div>
                    ))}
                </div>
            </div>
        </div>
    );
}
