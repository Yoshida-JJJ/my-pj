"use client";

import { motion } from "framer-motion";
import { Button } from "./Button";
import Image from "next/image";
// Trigger Vercel Deploy 2
import Link from "next/link";

export const Hero = () => {
    return (
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
            {/* Background Particles/Glow */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-neon-blue/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-neon-red/20 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <motion.h1
                        className="text-5xl md:text-7xl font-display font-extrabold leading-[1.1] tracking-tighter mb-8"
                    >
                        その重みに、<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-red">
                            魂が宿る。
                        </span>
                    </motion.h1>
                    <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-lg leading-relaxed">
                        Physical Weight, Digital Soul.<br />
                        ただの所有から、体験する所有へ。リアルとデジタルが交差する、カードコレクションの新たな夜明け。
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <Link href="https://tc-app-staging.vercel.app/">
                            <Button variant="primary" className="!px-10">
                                今すぐ始める
                            </Button>
                        </Link>
                        <Link href="/concept">
                            <Button variant="outline">
                                開発構想（ロードマップ）を見る
                            </Button>
                        </Link>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                    animate={{ opacity: 1, scale: 1, rotate: 2 }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    className="relative aspect-square flex items-center justify-center"
                >
                    {/* Main Card Visual with Glassmorphism Border */}
                    <div className="relative w-full max-w-[400px] aspect-[3/4] rounded-2xl overflow-hidden neon-glow-blue border border-white/20 transform hover:scale-105 transition-transform duration-500 shadow-[0_0_50px_rgba(0,240,255,0.2)]">
                        <Image
                            src="/images/hero_card.png"
                            alt="Stadium Card Visual"
                            fill
                            className="object-cover"
                            priority
                            sizes="(max-width: 768px) 100vw, 400px"
                        />
                        {/* Holographic Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
                    </div>

                    {/* Floating UI Elements */}
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-10 -right-5 md:right-0 glass p-5 rounded-2xl border border-neon-blue/30 neon-glow-blue"
                    >
                        <div className="text-[10px] text-neon-blue font-bold mb-1 tracking-widest uppercase">Spirit Record</div>
                        <div className="text-lg font-bold font-display tracking-tight">INTENSITY: BEYOND LIMIT</div>
                    </motion.div>

                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute -bottom-10 -left-5 md:left-0 glass p-5 rounded-2xl border border-neon-red/30 neon-glow-red"
                    >
                        <div className="text-[10px] text-neon-red font-bold mb-1 tracking-widest uppercase">Legacy Value</div>
                        <div className="text-lg font-bold font-display tracking-tight">UNFATHOMABLE</div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
                <span className="text-[10px] font-bold tracking-[0.3em] text-white/40 uppercase">Scroll to Discover</span>
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-5 h-8 border-2 border-white/10 rounded-full flex justify-center p-1"
                >
                    <div className="w-1 h-1.5 bg-white/40 rounded-full" />
                </motion.div>
            </div>
        </section>
    );
};
