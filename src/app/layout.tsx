import type { Metadata, Viewport } from "next";
import { Geist, Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { CookieBanner } from "@/components/cookie-banner";
import { AnalyticsGate } from "@/components/analytics-gate";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});
const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nextquests.com";
const description =
  "Log the games. Rate the bangers. Climb the community-ranked top 20 in every genre.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "NextQuest", template: "%s · NextQuest" },
  description,
  openGraph: {
    type: "website",
    siteName: "NextQuest",
    title: "NextQuest",
    description,
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NextQuest",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#06070d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${pressStart.variable} ${vt323.variable} flex min-h-screen flex-col bg-[#06070d] text-neutral-100 antialiased`}
      >
        <Nav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        <Footer />
        <CookieBanner />
        <AnalyticsGate />
      </body>
    </html>
  );
}
