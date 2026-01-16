"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export const LiveMoments = () => {
    const timelineEvents = [
        { time: "The Beginning", event: "真実が刻まれる瞬間", active: false },
        { time: "The Journey", event: "オーナーの手を渡り継ぐ", active: false },
        { time: "The Legend", event: "唯一無二の物語へと進化", active: true },
    ];

    return (
        <section id="features" className="py-32 bg-stadium-black relative overflow-hidden">
            {/* Decorative Grids */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="text-neon-blue font-display font-bold tracking-[0.2em] mb-4 uppercase text-sm">Living History</h2>
                    <h3 className="text-4xl md:text-6xl font-display font-extrabold mb-8 leading-tight tracking-tighter">
                        データではなく、<br />
                        「物語」を刻め。
                    </h3>
                    <p className="text-xl text-gray-400 mb-10 leading-relaxed font-light">
                        Live Momentsは単なる統計ではありません。それは、白球が空を切り、歓喜がスタジアムを揺らしたその瞬間の記憶。<br /><br />
                        あなたのカードは、ただそこにあるだけの静止画ではなく、現実の世界と同期し、共に呼吸し、成長し続ける「生きたアーカイブ」です。
                    </p>

                    <div className="space-y-6">
                        {timelineEvents.map((item, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                key={i}
                                className={`flex items-center gap-6 p-5 rounded-2xl border transition-all duration-500 ${item.active ? "border-neon-blue/40 bg-neon-blue/5 neon-glow-blue" : "border-white/5 bg-white/5"}`}
                            >
                                <span className={`text-[10px] font-bold tracking-widest uppercase ${item.active ? "text-neon-blue" : "text-gray-500"}`}>{item.time}</span>
                                <span className="font-medium text-lg tracking-tight">{item.event}</span>
                                {item.active && (
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="ml-auto w-2 h-2 rounded-full bg-neon-blue shadow-[0_0_10px_#00f0ff]"
                                    />
                                )}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, rotate: 3 }}
                    whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="relative aspect-[4/5] lg:aspect-square"
                >
                    <div className="relative w-full h-full rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
                        <Image
                            src="/images/live_moment.png"
                            alt="Live Moment Feature"
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                        {/* Dynamic Aura */}
                        <motion.div
                            animate={{ opacity: [0.2, 0.4, 0.2] }}
                            transition={{ repeat: Infinity, duration: 4 }}
                            className="absolute inset-0 bg-gradient-to-br from-neon-blue/30 via-transparent to-neon-red/20 pointer-events-none"
                        />
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
