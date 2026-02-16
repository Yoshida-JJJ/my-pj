import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type LiveMomentData = {
    id: string;
    player_name: string;
    type: "HOMERUN" | "BIG_PLAY" | "VICTORY" | "RECORD_BREAK" | "system_notice";
    title: string;
    description?: string;
    intensity: number; // 1-5
};

interface LiveMomentToastProps {
    data: LiveMomentData | null;
    onDismiss: () => void;
}

export default function LiveMomentToast({ data, onDismiss }: LiveMomentToastProps) {
    const router = useRouter();

    if (!data) return null;

    // Determine colors based on intensity/type
    // User Request: Make ALL notifications Gold (Premium Look)
    const isGold = true;

    // Base styles
    const containerClasses = isGold
        ? "bg-gradient-to-r from-brand-gold/90 to-brand-gold-glow/90 border-brand-gold text-brand-dark"
        : "bg-brand-dark-light/95 border-brand-blue/30 text-white backdrop-blur-xl";

    const handleClick = () => {
        router.push(`/market?search=${encodeURIComponent(data.player_name)}&sort=newest`);
        onDismiss();
    };

    return (
        <AnimatePresence>
            <div className="fixed top-24 right-4 md:right-8 z-[100] w-full max-w-sm pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 100, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    onClick={handleClick}
                    className={`
                        pointer-events-auto p-4 rounded-xl border shadow-2xl overflow-hidden relative cursor-pointer group
                        ${containerClasses}
                        hover:scale-105 transition-transform duration-300
                    `}
                >
                    {/* Intensity Particles/Glow (Simplified CSS) */}
                    {isGold && (
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
                    )}
                    {data.intensity === 5 && (
                        <div className="absolute inset-0 animate-pulse bg-brand-gold/20 z-0" />
                    )}

                    <div className="relative z-10 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${isGold ? 'border-brand-dark/20 bg-brand-dark/10' : 'border-white/10 bg-white/5'}`}>
                                {data.type.replace('_', ' ')}
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                                className="opacity-60 hover:opacity-100 p-1"
                            >
                                ×
                            </button>
                        </div>

                        <h4 className={`font-heading font-bold text-lg leading-tight mt-1 ${isGold ? 'text-brand-dark' : 'text-white'}`}>
                            {data.title}
                        </h4>

                        <p className={`text-sm font-bold opacity-80 ${isGold ? 'text-brand-dark' : 'text-brand-platinum'}`}>
                            {data.player_name}
                        </p>

                        {data.description && (
                            <p className={`text-xs mt-1 leading-relaxed ${isGold ? 'text-brand-dark/80' : 'text-brand-platinum/60'}`}>
                                {data.description}
                            </p>
                        )}

                        {/* CTA Button */}
                        <div className="mt-3 flex justify-end">
                            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isGold ? 'text-brand-dark group-hover:underline' : 'text-white'}`}>
                                カードを見る
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
