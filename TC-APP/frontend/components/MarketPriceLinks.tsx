'use client';

import { useState, useEffect } from 'react';
import { Search, ExternalLink, ShoppingBag, Gavel, Globe } from 'lucide-react';

interface MarketPriceLinksProps {
    initialQuery: string;
}

export default function MarketPriceLinks({ initialQuery }: MarketPriceLinksProps) {
    const [query, setQuery] = useState(initialQuery);

    // Sync state if prop changes (e.g. AI re-analyzes)
    useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    const openSearch = (urlTemplate: string) => {
        if (!query.trim()) return;
        const encodedQuery = encodeURIComponent(query.trim());
        const url = urlTemplate.replace('{encodedQuery}', encodedQuery);
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="glass-panel p-4 rounded-xl border border-white/10 animate-fade-in-up">
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-brand-platinum flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        相場をチェック (参考)
                    </label>
                </div>

                {/* Editable Query Input */}
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue/50 transition-colors"
                        placeholder="キーワードを入力 (例: 大谷翔平 2024)"
                    />
                    <div className="absolute right-3 top-2.5 pointer-events-none">
                        <span className="text-xs text-brand-platinum/50">キーワードを編集</span>
                    </div>
                </div>

                {/* Market Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                    {/* Mercari */}
                    <button
                        type="button"
                        onClick={() => openSearch('https://jp.mercari.com/search?keyword={encodedQuery}&status=sold_out_processing,sold_out')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all text-sm font-medium group"
                    >
                        <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span>Mercari</span>
                        <ExternalLink className="w-3 h-3 opacity-50" />
                    </button>

                    {/* Yahoo Auction */}
                    <button
                        type="button"
                        onClick={() => openSearch('https://auctions.yahoo.co.jp/search/search?p={encodedQuery}&aucmaxprice=999999999&istatus=2')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all text-sm font-medium group"
                    >
                        <Gavel className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span>Yahoo!</span>
                        <ExternalLink className="w-3 h-3 opacity-50" />
                    </button>

                    {/* eBay */}
                    <button
                        type="button"
                        onClick={() => openSearch('https://www.ebay.com/sch/i.html?_nkw={encodedQuery}&LH_Sold=1')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all text-sm font-medium group"
                    >
                        <Globe className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span>eBay</span>
                        <ExternalLink className="w-3 h-3 opacity-50" />
                    </button>
                </div>
            </div>
        </div>
    );
}
