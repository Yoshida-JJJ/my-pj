"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export const HeatTrade = () => {
    const isFever = true;

    return (
        <section id="heat-trade" className="py-32 bg-stadium-black relative overflow-hidden">
            {/* Dynamic Background Glow */}
            <div className={`absolute inset-0 transition-opacity duration-1000 ${isFever ? "opacity-20" : "opacity-0"}`}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle,rgba(255,165,0,0.3)_0%,transparent_70%)] animate-pulse" />
            </div>

            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-neon-blue font-display font-bold tracking-[0.2em] uppercase text-sm">Live Engagement</span>
                        {isFever && (
                            <motion.span
                                animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }}
                                transition={{ repeat: Infinity, duration: 0.5 }}
                                className="px-3 py-1 rounded-full bg-orange-500 text-black text-[10px] font-black tracking-tighter uppercase"
                            >
                                Fever Time Active
                            </motion.span>
                        )}
                    </div>

                    <h3 className="text-4xl md:text-6xl font-display font-extrabold mb-8 leading-tight tracking-tighter">
                        ライブ連動型取引<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">
                            ヒート・トレード
                        </span>
                    </h3>
                    <p className="text-xl text-gray-400 mb-10 leading-relaxed font-light">
                        スタジアムが揺れる。その瞬間、マーケットも共鳴する。特定の選手が活躍した刹那、アプリ内では「フィーバータイム」が発動。<br /><br />
                        それは、あなたがスタジアムの熱狂と完全にシンクロした証。特別なエフェクトが刻まれたカードは、その瞬間の興奮を永遠に封じ込めます。
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 group hover:border-orange-500/50 transition-colors">
                            <div className="text-xs font-bold text-orange-400 mb-2 uppercase">Stadium Sync</div>
                            <div className="text-3xl font-bold font-display">FEVER MODE</div>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 group hover:border-neon-blue/50 transition-colors">
                            <div className="text-xs font-bold text-neon-blue mb-2 uppercase">Proof of Passion</div>
                            <div className="text-3xl font-bold font-display">IGNITION</div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1 }}
                    className="relative aspect-square flex items-center justify-center"
                >
                    {/* Heat Card Display */}
                    <div className="relative w-[80%] aspect-[3/4] rounded-2xl overflow-hidden border border-orange-500/50 shadow-[0_0_50px_rgba(255,165,0,0.3)]">
                        <Image
                            src="/images/live_moment.png"
                            alt="Heat Trade Fever"
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                        {/* Fever Overlay */}
                        <motion.div
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute inset-0 bg-gradient-to-t from-orange-500/40 via-transparent to-transparent pointer-events-none"
                        />
                        <div className="absolute top-4 right-4 glass px-3 py-1 rounded-full border border-orange-500/50 text-[10px] font-bold text-orange-400">
                            HOT MOMENT
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
