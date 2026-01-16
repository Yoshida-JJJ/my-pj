"use client";

import { motion } from "framer-motion";
import { Twitter, Disc as Discord, Github } from "lucide-react";
import Link from "next/link";

export const Footer = () => {
    return (
        <footer className="py-32 bg-stadium-black border-t border-white/5 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-neon-blue/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <div className="flex items-center justify-center gap-3 mb-10">
                        <div className="w-8 h-8 bg-gradient-to-br from-neon-blue to-neon-red rounded-lg" />
                        <span className="text-xl font-display font-bold tracking-tighter">STADIUM <span className="text-neon-blue">CARD</span></span>
                    </div>

                    <h2 className="text-4xl md:text-6xl font-display font-extrabold mb-16 tracking-tighter leading-[1.1]">
                        その瞬間を、歴史に変えよう。
                    </h2>

                    <div className="flex flex-wrap justify-center gap-12 mb-20 text-sm font-medium tracking-widest uppercase text-gray-500">
                        <Link href="/" className="hover:text-white transition-colors">Top</Link>
                        <Link href="/concept" className="hover:text-white transition-colors">Concept</Link>
                        <a href="#roadmap" className="hover:text-white transition-colors">Evolution</a>
                        <a href="#" className="hover:text-white transition-colors">Policy</a>
                    </div>

                    <div className="flex justify-center gap-6 mb-16">
                        {[
                            { icon: <Twitter size={20} />, href: "#" },
                            { icon: <Discord size={20} />, href: "#" },
                            { icon: <Github size={20} />, href: "#" }
                        ].map((social, i) => (
                            <motion.a
                                key={i}
                                href={social.href}
                                whileHover={{ y: -5, scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-full border border-white/5 hover:border-neon-blue/50 hover:text-neon-blue transition-colors shadow-lg hover:shadow-neon-blue/20"
                            >
                                {social.icon}
                            </motion.a>
                        ))}
                    </div>

                    <div className="text-gray-600 text-xs tracking-widest font-medium uppercase">
                        © 2026 Stadium Card Inc. / Redefining the Collection.
                    </div>
                </motion.div>
            </div>
        </footer>
    );
};
