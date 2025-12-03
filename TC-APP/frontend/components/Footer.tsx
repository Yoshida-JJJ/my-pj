import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-brand-dark border-t border-brand-platinum/10 py-12 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <span className="font-heading text-2xl font-bold tracking-tighter text-white">
                                TC<span className="text-brand-blue">.APP</span>
                            </span>
                        </Link>
                        <p className="text-brand-platinum/60 max-w-sm">
                            The premier marketplace for professional baseball trading cards.
                            Buy, sell, and collect with confidence.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-heading font-bold text-white mb-4">Marketplace</h3>
                        <ul className="space-y-2">
                            <li><Link href="/" className="text-brand-platinum/60 hover:text-brand-blue transition-colors">All Listings</Link></li>
                            <li><Link href="/sell" className="text-brand-platinum/60 hover:text-brand-blue transition-colors">Start Selling</Link></li>
                            <li><Link href="/catalog" className="text-brand-platinum/60 hover:text-brand-blue transition-colors">Card Catalog</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-heading font-bold text-white mb-4">Support</h3>
                        <ul className="space-y-2">
                            <li><Link href="/help" className="text-brand-platinum/60 hover:text-brand-blue transition-colors">Help Center</Link></li>
                            <li><Link href="/terms" className="text-brand-platinum/60 hover:text-brand-blue transition-colors">Terms of Service</Link></li>
                            <li><Link href="/privacy" className="text-brand-platinum/60 hover:text-brand-blue transition-colors">Privacy Policy</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-brand-platinum/10 text-center text-brand-platinum/40 text-sm">
                    &copy; {new Date().getFullYear()} TC-APP. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
