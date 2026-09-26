import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { resolveSiteBrand } from "@/lib/site-brand";

import "./globals.css";

export const revalidate = 3600;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateMetadata(): Metadata {
  const brand = resolveSiteBrand();

  return {
    metadataBase: new URL("https://frieren.oreotm.xyz"),
    title: {
      default: brand.name,
      template: `%s | ${brand.name}`,
    },
    applicationName: brand.name,
    description: `${brand.tagline} Play FrierenGuessr and test which moments stayed with you.`,
    openGraph: {
      type: "website",
      siteName: brand.name,
      title: brand.name,
      description: "A calm, unofficial Frieren fan-game collection.",
      url: "/",
    },
    twitter: {
      card: "summary",
      title: brand.name,
      description: brand.tagline,
    },
    icons: { icon: brand.iconPath },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
        <SpeedInsights />
      </body>
    </html>
  );
}
