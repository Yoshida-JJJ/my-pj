import Link from 'next/link';

export default function HeroSection() {
    return (
        <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-brand-dark pt-20">
            {/* Spotlight Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {/* Main Top Spotlight */}
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-gold/20 rounded-full blur-[100px] opacity-60 animate-pulse-slow"></div>
                {/* Side Blue Glows */}
                <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-brand-blue/10 rounded-full blur-[120px]"></div>
                <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-brand-blue/10 rounded-full blur-[120px]"></div>
                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20 bg-center"></div>
            </div>

            {/* Floating Card Display */}
            <div className="relative z-10 mb-12 animate-float">
                <div className="relative w-64 h-96 md:w-80 md:h-[500px] rounded-2xl p-2 bg-gradient-to-b from-brand-platinum/20 to-brand-dark-light/80 backdrop-blur-md border border-brand-platinum/30 shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                    {/* Inner Card Frame */}
                    <div className="w-full h-full rounded-xl overflow-hidden relative border border-brand-blue/30 bg-brand-dark-light">
                        {/* Card Image Placeholder */}
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-dark-light to-brand-blue/20 flex items-center justify-center">
                            <span className="text-brand-platinum/20 font-heading text-6xl font-bold">TC</span>
                        </div>
                        <img
                            src="https://placehold.co/400x600/1e293b/e2e8f0?text=Legendary+Holo"
                            alt="Featured Card"
                            className="w-full h-full object-cover opacity-80 mix-blend-overlay"
                        />

                        {/* Holo Effect Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-50"></div>

                        {/* Card Details Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-brand-gold text-xs font-bold tracking-widest mb-1">LEGENDARY HOLO</p>
                                    <h3 className="text-white font-heading text-xl font-bold">BABE RUTH</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-brand-blue-glow text-xs uppercase">Serial #1/1</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Outer Glow Ring */}
                    <div className="absolute -inset-4 border border-brand-blue/20 rounded-3xl -z-10 animate-pulse-slow"></div>
                    <div className="absolute -inset-1 bg-gradient-to-b from-brand-gold/20 to-transparent rounded-2xl -z-10 blur-md"></div>
                </div>
            </div>

            <div className="relative z-10 container mx-auto px-4 text-center">
                <h1 className="font-heading text-5xl md:text-7xl font-bold mb-4 tracking-tight animate-fade-in-up">
                    <span className="text-brand-gold drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">THE FUTURE OF TRADING.</span><br />
                    <span className="text-brand-blue drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                        COLLECT THE UNTOUCHABLE.
                    </span>
                </h1>

                <p className="text-brand-platinum/80 text-lg md:text-xl mb-10 max-w-2xl mx-auto animate-fade-in-up delay-200">
                    Experience the next generation of sports card collecting.
                    Verify, trade, and showcase your assets in a premium ecosystem.
                </p>

                <div className="flex flex-col md:flex-row gap-6 justify-center animate-fade-in-up delay-300">
                    <Link
                        href="/market"
                        className="group relative px-8 py-4 bg-brand-blue text-white font-bold rounded-full overflow-hidden transition-all hover:scale-105 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        <span className="relative z-10">EXPLORE MARKETPLACE</span>
                    </Link>
                </div>
            </div>
        </section>
    );
}
