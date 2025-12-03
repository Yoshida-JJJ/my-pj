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
            animation: {
                "fade-in-up": "fadeInUp 0.5s ease-out forwards",
                "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "float": "float 6s ease-in-out infinite",
                "spotlight": "spotlight 2s ease-in-out infinite alternate",
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
                }
            },
        },
    },
    plugins: [],
};
