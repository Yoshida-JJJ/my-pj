import React from 'react';

interface PremiumCardImageProps {
    src: string;
    alt: string;
    className?: string;
}

const PremiumCardImage: React.FC<PremiumCardImageProps> = ({ src, alt, className = '' }) => {
    return (
        <div className={`relative overflow-hidden rounded-xl group ${className}`}>
            {/* Base Image with Filters */}
            <img
                src={src}
                alt={alt}
                className="w-full h-full object-cover filter contrast-110 saturate-125"
            />

            {/* Gold Frame Overlay */}
            <div className="absolute inset-0 border-[6px] border-brand-gold rounded-xl pointer-events-none shadow-[inset_0_0_20px_rgba(255,215,0,0.5)] z-10"></div>

            {/* Holographic Sheen Animation */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                <div className="absolute inset-0 w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white/30 to-transparent animate-shimmer-diagonal mix-blend-overlay"></div>
            </div>

            {/* Optional: Glass reflection effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-50 pointer-events-none z-10"></div>
        </div>
    );
};

export default PremiumCardImage;
