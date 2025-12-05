/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    dark: "#020408", // Deeper black/blue for background
                    "dark-light": "#0f172a",
                    blue: "#3b82f6",
                    "blue-glow": "#60a5fa",
                    gold: "#FFD700", // Bright Gold
                    bronze: "#CD7F32",
                    platinum: "#e2e8f0",
                },
            },
            fontFamily: {
                sans: ["var(--font-inter)", "sans-serif"],
                heading: ["var(--font-outfit)", "sans-serif"],
            },

            keyframes: {
                fadeInUp: {
                    "0%": { opacity: "0", transform: "translateY(10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-20px)" },
                },
                spotlight: {
                    "0%": { opacity: "0.5", transform: "scale(1)" },
                    "100%": { opacity: "1", transform: "scale(1.1)" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                "rotate-slow": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                },
                shake: {
                    "0%, 100%": { transform: "translateX(0)" },
                    "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-5px)" },
                    "20%, 40%, 60%, 80%": { transform: "translateX(5px)" },
                },
                "shimmer-diagonal": {
                    "0%": { transform: "translate(-100%, -100%) rotate(45deg)" },
                    "100%": { transform: "translate(100%, 100%) rotate(45deg)" },
                },
            },
            animation: {
                "fade-in-up": "fadeInUp 0.5s ease-out forwards",
                "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "float": "float 6s ease-in-out infinite",
                "spotlight": "spotlight 2s ease-in-out infinite alternate",
                "shimmer": "shimmer 3s linear infinite",
                "rotate-slow": "rotate-slow 10s linear infinite",
                "shake": "shake 0.5s cubic-bezier(.36,.07,.19,.97) both",
                "shimmer-diagonal": "shimmer-diagonal 3s ease-in-out infinite",
            },
        },
    },
    plugins: [],
};
