export default function SkeletonCard() {
    return (
        <div className="relative group w-full aspect-[3/4] rounded-xl overflow-hidden bg-brand-dark-light border border-white/5 animate-pulse">
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>

            <div className="h-full flex flex-col justify-end p-3">
                <div className="space-y-2">
                    <div className="h-4 bg-brand-platinum/10 rounded w-3/4"></div>
                    <div className="h-3 bg-brand-platinum/10 rounded w-1/2"></div>
                </div>
            </div>
        </div>
    );
}
