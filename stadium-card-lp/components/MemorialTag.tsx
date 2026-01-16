"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Quote, Sparkles, History } from "lucide-react";
import { useState } from "react";

const STORIES = [
    {
        id: "legend",
        label: "LEGEND",
        icon: <History size={14} />,
        subtitle: "1994.10.08 / Nagoya",
        title: "落合博満",
        description: "30年前のあの日、ナゴヤ球場で目撃した勝負師の矜持。",
        quote: [
            "「1994年10月8日。ナゴヤ球場の空気が、あんなにも重く、それでいて狂おしいほど熱かったことはありません。巨人と中日、勝った方が優勝。野球の長い歴史でも、これほどの極限状態は二度とないでしょう。」",
            "「巨人の4番・落合博満。不敵な笑みを浮かべ、満身創痍の体で放った先制ソロとタイムリー。勝負師の魂そのものでした。しかし、彼は死闘の途中で負傷退場。その時の彼の背中、そして静かに流した涙こそが、プロの矜持を教えてくれました。」",
            "「このカードに触れるたび、あの日のスタジアムの怒号と、落合さんの凄み、そして静寂が蘇る。これは単なる記念品じゃない。私の情熱の記憶、そのものです。」"
        ],
        owner: "Legend Watcher",
        image: "/images/hero_card.png",
        tag: "Memorial Artifact",
        tagDetail: "1994.10.08 / vs Dragons / Championship Game"
    },
    {
        id: "modern",
        label: "NEW ERA",
        icon: <Sparkles size={14} />,
        subtitle: "2025.11.01 / Toronto",
        title: "山本由伸",
        description: "常識を覆した死闘。世界を跪かせた、静かなる覇気。",
        quote: [
            "「第6戦で1失点完投、そのわずか24時間後。第7戦の九回、マウンドに彼が立っているのを見て震えが止まりませんでした。中0日。監督に自ら志願したブルペン入り。あの『投げることへの執念』が形になった瞬間でした。」",
            "「10回、11回と回が進む中で、スタンドの誰もが『交代するな、彼でいってくれ』と祈るように願っていました。この熱投を終わらせたくない、伝説の目撃者であり続けたい。あの時のスタジアムの一体感は、一生忘れられません。」",
            "「ランディ・ジョンソン以来のWS3勝。異次元の記録以上に、気迫が凄かった。満塁のピンチを切り抜けた刹那、吠えた彼の姿。このカードを保有することは、現代野球の奇跡を所有することと同じなんです。」"
        ],
        owner: "Global Ace Collector",
        image: "/images/phantom_ace_pitcher.png",
        tag: "World Series Hero",
        tagDetail: "2025.11.01 / WS Game 7 / Series MVP"
    }
];

export const MemorialTag = () => {
    const [activeTab, setActiveTab] = useState(1);
    const story = STORIES[activeTab];

    return (
        <section className="py-32 bg-stadium-gray relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="lg:order-2"
                >
                    <h2 className="text-neon-red font-display font-bold tracking-[0.2em] mb-4 uppercase text-sm">Emotional Asset</h2>
                    <h3 className="text-4xl md:text-6xl font-display font-extrabold mb-8 leading-tight tracking-tighter">
                        想いを宿す、<br />
                        <span className="text-white/50">メモリアル・タグ</span>
                    </h3>

                    <div className="flex gap-4 mb-10">
                        {STORIES.map((s, idx) => (
                            <button
                                key={s.id}
                                onClick={() => setActiveTab(idx)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 ${activeTab === idx
                                    ? "bg-neon-red border-neon-red text-white shadow-[0_0_15px_rgba(255,0,0,0.3)]"
                                    : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                                    }`}
                            >
                                {s.icon}
                                <span className="text-[10px] font-bold tracking-widest uppercase">{s.label}</span>
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={story.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h4 className="text-3xl font-display font-bold mb-6 text-white">
                                {story.title}
                            </h4>
                            <p className="text-xl text-gray-400 mb-10 leading-relaxed font-light">
                                {story.description}<br /><br />
                                {story.id === "legend" ? (
                                    <>カードの状態だけでなく、あなたの「思い出」を価値にする。ブロックチェーンに刻まれた「ファンの熱量」が、カードの真価を証明します。</>
                                ) : (
                                    <>記録は塗り替えられるが、記憶は永遠に色褪せない。あの日、あの場所で共有した熱狂こそが、このカードに唯一無二の価値を与えます。</>
                                )}
                            </p>

                            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl relative">
                                <Quote className="absolute top-6 left-6 text-white/10" size={48} />
                                <div className="text-gray-300 italic mb-6 relative z-10 pl-8 pt-4 leading-relaxed">
                                    {story.quote.map((q, i) => (
                                        <p key={i} className="mb-4 last:mb-0">{q}</p>
                                    ))}
                                </div>
                                <div className="flex items-center gap-4 pl-8">
                                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${activeTab === 0 ? 'from-orange-500 to-neon-blue' : 'from-neon-blue to-neon-red'} shadow-[0_0_15px_rgba(255,255,255,0.1)]`} />
                                    <div>
                                        <div className="text-sm font-bold tracking-tight">Original Owner: {story.owner}</div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">{story.subtitle}</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </motion.div>

                <div className="lg:order-1 flex justify-center sticky top-32">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={story.id}
                            initial={{ opacity: 0, scale: 0.9, rotateY: 90 }}
                            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                            exit={{ opacity: 0, scale: 0.9, rotateY: -90 }}
                            transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
                            className="relative w-full max-w-[420px] aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl"
                        >
                            <Image
                                src={story.image}
                                alt={story.title}
                                fill
                                className="object-cover opacity-60"
                                sizes="(max-width: 768px) 100vw, 420px"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-stadium-black via-transparent to-transparent" />

                            {/* Tag Overlay */}
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[85%]">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="glass p-5 rounded-2xl border border-neon-blue/20"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-4 h-4 rounded-full bg-neon-blue/20 flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-neon-blue shadow-[0_0_5px_#00f0ff]" />
                                        </div>
                                        <span className="text-[9px] font-bold text-neon-blue uppercase tracking-widest">{story.tag}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 line-clamp-2">
                                        {story.tagDetail}
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
};
