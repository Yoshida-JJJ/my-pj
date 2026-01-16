import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import clsx from "clsx";
import { LayoutTransition } from "@/components/LayoutTransition";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
    title: "Stadium Card - Your Cards are Alive",
    description: "Next Generation MLB/NPB Trading Card Marketplace",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja">
            <body className={clsx(inter.className, outfit.variable, "bg-stadium-black text-white antialiased")}>
                <LayoutTransition>
                    {children}
                </LayoutTransition>
            </body>
        </html>
    );
}
