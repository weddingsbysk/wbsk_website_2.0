import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { SiteShell } from "../components/SiteShell";
import { introDecisionScript } from "../lib/intro";
import { isProduction, publicAsset, siteUrl } from "../lib/site";
import "./globals.css";

const bodoni = localFont({
  src: "../fonts/bodoni-moda.woff2",
  weight: "400 500",
  variable: "--font-bodoni",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
const hanken = localFont({
  src: "../fonts/hanken-grotesk.woff2",
  weight: "400 600",
  variable: "--font-hanken",
  display: "swap",
});
const amp = localFont({
  src: "../fonts/bodoni-moda-amp.woff2",
  weight: "400 500",
  style: "italic",
  variable: "--font-bodoni-amp",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "WBSK", template: "%s | WBSK" },
  description: "Wedding films and photographs by Weddings By Siddhant Kapoor.",
  robots: isProduction ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1F1914" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bodoni.variable} ${hanken.variable} ${amp.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Photos all come from here, so the connection is ready before the first one is asked for. */}
        <link rel="preconnect" href="https://cdn.sanity.io" />
        <script dangerouslySetInnerHTML={{ __html: introDecisionScript(publicAsset("")) }} />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
