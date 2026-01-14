"use client";

import { motion } from "framer-motion";
import { Box, Sparkles, ArrowRightLeft, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "./Button";

export const FutureVision = () => {
    const visions = [
        {
            icon: <Box className="text-neon-blue" />,
            title: "Connected Collectibles",
            desc: "物理カードとデジタルツインを完全同期。物流の制約を超えた取引インフラ。"
        },
        {
            icon: <Sparkles className="text-neon-red" />,
            title: "Hyper-Reality Experience",
            desc: "8K 3DスキャンとAR展示。手元にあるような質感と輝きをデジタルで。"
        },
        {
            icon: <Shield className="text-neon-blue" />,
            title: "Safe Vaulting & DeFi",
            desc: "厳重な保管庫と分散型金融の融合。眠れる資産に流動性を。"
        }
    ];

    return (
        <section id="future" className="py-32 bg-stadium-gray/20 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col lg:flex-row gap-20 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="lg:w-1/2"
                    >
                        <h2 className="text-neon-blue font-display font-bold tracking-[0.2em] mb-4 uppercase text-sm">Upcoming Evolution</h2>
                        <h3 className="text-4xl md:text-6xl font-display font-extrabold mb-8 leading-tight tracking-tighter">
                            カードの在り方を、<br />
                            <span className="text-white">アップデート</span>
                        </h3>
                        <p className="text-xl text-gray-400 mb-10 leading-relaxed font-light">
                            Stadium Cardの旅は、まだ始まったばかりです。物流とWeb3の融合、そして現実を超える視覚体験。これから実装される進化は、あなたの所有体験を根底から書き換えます。
                        </p>
                        <Link href="/concept">
                            <Button variant="outline" className="border-neon-blue text-neon-blue hover:bg-neon-blue/10">
                                開発構想（ロードマップ）を見る
                            </Button>
                        </Link>
                    </motion.div>

                    <div className="lg:w-1/2 grid grid-cols-1 gap-6">
                        {visions.map((v, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="glass p-8 rounded-3xl border border-white/5 flex gap-6 items-start hover:border-white/14 transition-all"
                            >
                                <div className="p-4 rounded-2xl bg-white/5">
                                    {v.icon}
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold mb-2">{v.title}</h4>
                                    <p className="text-gray-400 text-sm leading-relaxed">{v.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="glass p-8 rounded-3xl border border-white/5 flex gap-6 items-start hover:border-white/14 transition-all"
                        >
                            <div className="p-4 rounded-2xl bg-white/5">
                                <Sparkles className="text-neon-red" />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold mb-2">Social Impulse</h4>
                                <p className="text-gray-400 text-sm leading-relaxed">TikTok/Instagramライブコマース完全統合。SNSの熱狂をそのまま取引へ昇華。</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};
