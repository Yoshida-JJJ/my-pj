'use client';

import './globals.css';


export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body className="bg-brand-dark text-white">
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
                        <p className="text-brand-platinum/60 mb-6">{error.message}</p>
                        <button
                            onClick={() => reset()}
                            className="px-4 py-2 bg-brand-blue rounded-lg hover:bg-brand-blue-glow transition-colors"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
