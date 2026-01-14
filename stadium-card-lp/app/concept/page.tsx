"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ArrowLeft, Sparkles, History, Zap, ArrowRightLeft } from "lucide-react";
import { useRef } from "react";

export default function ConceptPage() {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    return (
        <main ref={containerRef} className="min-h-screen bg-stadium-black text-white selection:bg-neon-blue selection:text-black">
            <Navbar />

            {/* Hero Section: The Fusion */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden pt-20">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,240,255,0.1),transparent_70%)]" />
                </div>

                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                    >
                        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-12 group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-xs font-bold tracking-widest uppercase">Back to Top</span>
                        </Link>

                        <h1 className="text-5xl md:text-8xl font-display font-extrabold leading-[1.1] tracking-tighter mb-4">
                            Physical Weight,<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-red">
                                Digital Soul.
                            </span>
                        </h1>
                        <div className="inline-flex flex-col items-start gap-2 mb-8">
                            <div className="px-3 py-1 border border-neon-red/50 bg-neon-red/10 rounded text-neon-red text-[10px] font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(255,0,0,0.2)]">
                                Under Development / Future Roadmap
                            </div>
                            <p className="text-[10px] text-gray-400">※掲載されている機能は現在開発中の構想です。</p>
                        </div>
                        <p className="text-xl md:text-2xl text-gray-400 font-light leading-relaxed max-w-xl">
                            手に取れる重みと、色褪せない魂。<br />
                            Stadium Cardは、物理的なカードの感触と、デジタルがもたらす永続的な躍動を一つに融合させます。
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="relative aspect-square flex items-center justify-center"
                    >
                        <div className="relative w-full h-full p-8">
                            <Image
                                src="/images/concept_hero.png"
                                alt="Baseball Concept Hero"
                                fill
                                className="object-contain"
                            />
                            <p className="absolute bottom-4 right-4 text-[8px] text-gray-600 z-20">※画面は開発中のイメージです</p>
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-stadium-black/50" />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Section 2: The Connection */}
            <section className="relative py-32 overflow-hidden border-y border-white/5">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-24">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
                        >
                            <History size={14} className="text-neon-blue" />
                            <span className="text-[10px] font-bold tracking-widest uppercase">Living Resume</span>
                        </motion.div>
                        <h2 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter mb-8">
                            世代を超える、想いの継承
                        </h2>
                        <p className="text-lg text-gray-400 font-light max-w-2xl mx-auto">
                            カードは人から人へ渡るたびに、単なるデータではない「物語」を蓄積していきます。<br /><br />
                            「伝説の10.8決戦での落合博満の背中」から「2025年ワールドシリーズで見せた山本由伸の気迫」まで。オーナーが刻む独自のストーリー（メモリアル・タグ）は、ブロックチェーンによって永遠の価値となり、次なる継承者へと手渡される未来を描いています。
                        </p>
                        <p className="text-[10px] text-gray-600 mt-4 text-center">※メモリアル・タグ機能は開発構想段階です</p>
                    </div>

                    <div className="relative aspect-video rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                        <Image
                            src="/images/connection.png"
                            alt="Connection Concept"
                            fill
                            className="object-cover"
                        />
                        {/* Scroll-linked overlay blur or darkening */}
                        <motion.div
                            style={{ opacity: useTransform(scrollYProgress, [0.3, 0.5], [0.5, 0]) }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
                        >
                            <span className="text-sm font-bold tracking-[0.5em] text-white/40 uppercase">Keep Scrolling</span>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Section 3: The Infrastructure (Vaulting & Liquidity) */}
            <section className="relative py-48 overflow-hidden bg-stadium-black">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                        <div className="relative">
                            <div className="absolute -top-20 -left-20 w-64 h-64 bg-neon-blue/10 rounded-full blur-[100px]" />
                            <h2 className="text-neon-blue font-display font-bold tracking-[0.2em] mb-6 uppercase text-sm">Infrastructure</h2>
                            <h3 className="text-4xl md:text-7xl font-display font-extrabold mb-8 tracking-tighter leading-tight">
                                Vaulting &<br />Liquidity
                            </h3>
                            <p className="text-lg text-gray-400 font-light mb-12 leading-relaxed">
                                物理的な制約を取り払い、カードに本当の流動性を。<br /><br />
                                鑑定・保管庫（ボールト）への預け入れにより、カードは即座にデジタルツイン（NFT）化される計画です。輸送コストや紛失リスクをゼロにし、ブロックチェーン上で秒速での売買を可能にする、Web3時代の新インフラ構築を目指しています。
                            </p>

                            <div className="flex flex-col gap-6">
                                {[
                                    { icon: <Zap size={20} />, title: "Connected Collectibles", desc: "物理カードとデジタル所有権が1対1で完全に同期する仕組みを開発中。" },
                                    { icon: <ArrowRightLeft size={20} />, title: "Instant Liquidity", desc: "世界中の投資家と、秒速・低コストで国境なき取引の実現へ。" }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-6 p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="text-neon-blue">{item.icon}</div>
                                        <div>
                                            <div className="font-bold mb-1">{item.title}</div>
                                            <div className="text-sm text-gray-200">{item.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative pointer-events-none">
                            <div className="aspect-square relative flex items-center justify-center">
                                <div className="w-full h-full border border-white/5 rounded-full absolute animate-spin" style={{ animationDuration: '20s' }} />
                                <div className="w-[80%] h-[80%] border border-white/10 rounded-full absolute animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
                                <div className="w-[60%] h-[60%] border border-white/20 rounded-full absolute animate-spin" style={{ animationDuration: '10s' }} />

                                <motion.div
                                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
                                    transition={{ repeat: Infinity, duration: 8 }}
                                    className="w-48 h-64 bg-gradient-to-br from-neon-blue/20 to-stadium-blue/20 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl flex items-center justify-center p-8 text-center"
                                >
                                    <div className="text-[10px] font-bold tracking-[0.2em] text-white/40 mb-4 uppercase">Connected</div>
                                    <div className="text-2xl font-display font-extrabold leading-tight">THE VAULT ARCHIVE</div>
                                </motion.div>
                            </div>
                            <p className="text-[8px] text-gray-700 text-center mt-2">※ボールト機構の開発イメージ</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 4: The Future (DeFi & Social Commerce) */}
            <section className="relative py-48 overflow-hidden bg-stadium-gray/20">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="order-2 lg:order-1"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="aspect-square glass rounded-3xl border border-white/5 flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-neon-red/10 flex items-center justify-center">
                                        <Sparkles className="text-neon-red" size={24} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <div className="order-1 lg:order-2">
                        <h2 className="text-neon-red font-display font-bold tracking-[0.2em] mb-6 uppercase text-sm">Future Horizon</h2>
                        <h3 className="text-4xl md:text-7xl font-display font-extrabold mb-8 tracking-tighter leading-tight">
                            Value Unleashed:<br />DeFi & Social
                        </h3>
                        <p className="text-lg text-gray-400 font-light mb-12 leading-relaxed">
                            カードは単なるコレクションから、活用可能な資産へと進化することを目指します。<br /><br />
                            保管中のカードNFTを担保にしたレンディング（資金融資）や、TikTok/Instagramでのライブコマース統合。SNSの熱狂をそのまま取引へと繋げ、2.0時代の所有体験の定義を計画しています。
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <div className="text-neon-red font-bold mb-2">DeFi Integration</div>
                                <div className="text-sm text-gray-400">コレクションを休ませない。レンディング機能で資本効率の最大化を構想。</div>
                            </div>
                            <div>
                                <div className="text-neon-red font-bold mb-2">Social Commerce</div>
                                <div className="text-sm text-gray-400">SNSでの衝動買いに応える、秒速のソーシャル連動取引の実装予定。</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 5: Hyper-Reality (AR & 3D Scan) */}
            <section className="relative py-32 overflow-hidden">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-white font-display font-bold tracking-[0.2em] mb-6 uppercase text-sm">Unprecedented Fidelity</h2>
                    <h3 className="text-4xl md:text-6xl font-display font-extrabold mb-12 tracking-tighter">
                        そこに「ある」という、究極の体験。
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left bg-white/5 p-12 rounded-[3.5rem] border border-white/5">
                        {[
                            { title: "3D Scan Viewer", desc: "紙の繊維、ホログラムの輝き。ジャイロ連動で手元に。" },
                            { title: "AR Exhibition", desc: "リビングがスタジアムに。カードを等身大で召喚。" },
                            { title: "Metaverse Gallery", desc: "URL一つで世界中のコレクターと共有。" }
                        ].map((item, i) => (
                            <div key={i}>
                                <div className="text-neon-blue font-bold mb-3">{item.title}</div>
                                <p className="text-sm text-gray-400 leading-relaxed">{item.desc} (開発予定)</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
