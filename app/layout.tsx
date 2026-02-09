import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@/components/analytics";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "SOL Programs | Solana Programs Directory",
  description: "Browse 1,800+ Solana onchain programs. Find DEXs, NFT protocols, lending platforms, trading bots, and more from the Solana ecosystem.",
  keywords: ["Solana", "programs", "onchain", "DEX", "NFT", "DeFi", "blockchain", "smart contracts", "SOL Programs"],
  metadataBase: new URL('https://solanaprograms.dev'),
  icons: {
    icon: '/logo/nano-banana.svg',
    shortcut: '/logo/nano-banana.svg',
    apple: '/logo/nano-banana.svg',
  },
  openGraph: {
    title: 'SOL Programs Directory',
    description: 'Discover 1,800+ Solana onchain programs',
    type: 'website',
    images: [{
      url: '/og-image.svg',
      width: 1200,
      height: 630,
      alt: 'SOL Programs Directory',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SOL Programs Directory',
    description: 'Discover 1,800+ Solana onchain programs',
    images: ['/og-image.svg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground flex flex-col min-h-screen`}
      >
        <main className="flex-1 w-full">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
