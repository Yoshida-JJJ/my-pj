"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export const AIScanning = () => {
    return (
        <section className="py-32 bg-gradient-to-b from-stadium-black to-stadium-gray relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row-reverse gap-20 items-center">
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="lg:w-1/2"
                >
                    <h2 className="text-neon-red font-display font-bold tracking-[0.2em] mb-4 uppercase text-sm">Hyper-Reality</h2>
                    <h3 className="text-4xl md:text-6xl font-display font-extrabold mb-8 leading-tight tracking-tighter">
                        超高精細、<br />
                        デジタルツイン。
                    </h3>
                    <p className="text-xl text-gray-400 mb-10 leading-relaxed font-light">
                        これは単なる「所有権の証明」ではありません。カードの繊維、ホログラムの微細な輝きまでを3Dスキャンで完全再現。手元にあるような実体感を提供します。
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                        {[
                            { title: "3D Scan Viewer", desc: "ジャイロ連動。スマホを傾ければ光が美しく反射。" },
                            { title: "AR Exhibition", desc: "現実空間にカードを等身大で召喚。" },
                            { title: "Metaverse Gallery", desc: "URL一つで友人を招待できるバーチャル展示。" },
                        ].map((feat, i) => (
                            <div key={i} className="flex gap-4 items-start">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neon-red shadow-[0_0_10px_#ff004c]" />
                                <div>
                                    <div className="font-bold text-sm mb-1">{feat.title}</div>
                                    <div className="text-xs text-gray-400 leading-relaxed">{feat.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {[
                            { label: "Scan Resolution", value: "8K Ultra", detail: "肉眼を超える再現" },
                            { label: "Data Integrity", value: "Verified", detail: "NFTと1対1対応" },
                        ].map((stat, i) => (
                            <div key={i} className="glass p-8 rounded-[2rem] border border-white/5 group hover:border-white/10 transition-colors">
                                <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-bold">{stat.label}</div>
                                <div className="text-3xl font-bold font-display mb-1">{stat.value}</div>
                                <div className="text-xs text-neon-red/60 font-medium">{stat.detail}</div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="lg:w-1/2 relative flex justify-center"
                >
                    <div className="relative w-full max-w-[420px] aspect-[9/18.5] rounded-[3rem] p-3 border-[10px] border-stadium-light-gray/50 shadow-2xl overflow-hidden bg-black ring-1 ring-white/10">
                        <Image
                            src="/images/ai_scan.png"
                            alt="AI Scanning UI"
                            fill
                            className="object-cover opacity-80"
                            sizes="(max-width: 768px) 100vw, 420px"
                        />
                        {/* Scanning Line Animation - Refined */}
                        <motion.div
                            animate={{ top: ["5%", "95%", "5%"] }}
                            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-blue to-transparent shadow-[0_0_20px_#00f0ff] z-20 pointer-events-none"
                        />

                        {/* AI Data Points Overlay - Refined Vibe */}
                        <div className="absolute inset-x-8 bottom-16 z-20">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                className="glass p-5 rounded-2xl border border-white/10 backdrop-blur-xl"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="relative">
                                        <div className="w-2.5 h-2.5 rounded-full bg-neon-blue" />
                                        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-neon-blue animate-ping" />
                                    </div>
                                    <span className="text-[9px] font-bold text-neon-blue uppercase tracking-[0.2em]">Matrix Analysis</span>
                                </div>
                                <div className="text-base font-bold tracking-tight mb-1">LEGENDARY FOUND</div>
                                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Shohei Ohtani / BP-18-RC</div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
