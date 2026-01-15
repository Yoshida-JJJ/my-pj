import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                "stadium-black": "#0a0a0a",
                "neon-blue": "#00f0ff",
                "neon-red": "#ff003c",
                "stadium-gray": "#1a1a1a",
                "stadium-light-gray": "#333333",
            },
            fontFamily: {
                sans: ["Inter", "sans-serif"],
                display: ["Outfit", "sans-serif"],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
                "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))",
            },
            animation: {
                "glow-pulse": "glow-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "shimmer": "shimmer 3s ease-in-out infinite",
            },
            keyframes: {
                "glow-pulse": {
                    "0%, 100%": { opacity: "1", filter: "brightness(100%)" },
                    "50%": { opacity: "0.8", filter: "brightness(150%) blur(2px)" },
                },
                "shimmer": {
                    "0%, 100%": { "background-position": "200% 0" },
                    "50%": { "background-position": "0 0" },
                },
            },
        },
    },
    plugins: [],
};
export default config;
