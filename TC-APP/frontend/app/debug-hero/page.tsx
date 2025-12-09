'use client';
import Link from 'next/link';

export default function DebugHero() {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-10 p-10">
            <h1 className="text-3xl font-bold">Debug Hero Buttons</h1>

            <div className="border border-white p-5">
                <h2 className="mb-4">Option 1: Current Implementation</h2>
                <Link
                    href="/register"
                    className="group relative px-8 py-4 bg-yellow-500 text-black font-bold rounded-full transition-all hover:scale-105 shadow-lg flex items-center justify-center"
                >
                    <span className="relative z-10">SIGN UP NOW</span>
                </Link>
            </div>

            <div className="border border-white p-5">
                <h2 className="mb-4">Option 2: Plain HTML Anchor</h2>
                <a
                    href="/register"
                    className="px-8 py-4 bg-yellow-500 text-black font-bold rounded-full display-block"
                >
                    SIGN UP NOW (Plain HTML)
                </a>
            </div>
        </div>
    );
}
