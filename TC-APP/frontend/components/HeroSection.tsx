import Link from 'next/link';

export default function HeroSection() {
    return (
        <section className="relative w-full h-[80vh] flex items-center justify-center overflow-hidden bg-brand-dark">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-blue/20 rounded-full blur-[128px] animate-pulse-slow"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-gold/10 rounded-full blur-[128px] animate-pulse-slow delay-1000"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
            </div>

            <div className="relative z-10 container mx-auto px-4 text-center">
                <h1 className="font-heading text-5xl md:text-7xl font-bold mb-6 tracking-tight animate-fade-in-up">
                    <span className="text-white">Own the Moment.</span><br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-blue-glow text-glow">
                        Trade the Legend.
                    </span>
                </h1>

                <p className="text-brand-platinum text-lg md:text-xl mb-10 max-w-2xl mx-auto animate-fade-in-up delay-200">
                    The premium marketplace for rare baseball cards.
                    Secure, transparent, and built for the true collector.
                </p>

                <div className="flex flex-col md:flex-row gap-4 justify-center animate-fade-in-up delay-300">
                    <Link
                        href="/market"
                        className="px-8 py-4 bg-gradient-to-r from-brand-blue to-brand-blue-glow hover:from-brand-blue-glow hover:to-brand-blue text-white font-bold rounded-full transition-all shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_40px_rgba(59,130,246,0.8)] hover:scale-105"
                    >
                        Explore Market
                    </Link>
                    <Link
                        href="/sell"
                        className="px-8 py-4 bg-transparent border border-brand-platinum/30 hover:border-brand-gold/50 text-white font-bold rounded-full transition-all hover:bg-brand-gold/10 backdrop-blur-sm"
                    >
                        Start Selling
                    </Link>
                </div>
            </div>
        </section>
    );
}
