import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { SiteShell } from "../components/SiteShell";
import { getSocialLinks } from "../lib/content";
import { introDecisionScript } from "../lib/intro";
import { isProduction, publicAsset, siteUrl } from "../lib/site";
import "./globals.css";

const playfair = localFont({
  src: "../fonts/playfair-display.woff2",
  weight: "400 900",
  variable: "--font-playfair",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
const playfairItalic = localFont({
  src: "../fonts/playfair-display-italic.woff2",
  weight: "400 900",
  style: "italic",
  variable: "--font-playfair-italic",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});
const cormorant = localFont({
  src: "../fonts/cormorant-garamond.woff2",
  weight: "300 700",
  variable: "--font-cormorant",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
const cormorantItalic = localFont({
  src: "../fonts/cormorant-garamond-italic.woff2",
  weight: "300 700",
  style: "italic",
  variable: "--font-cormorant-italic",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});
const outfit = localFont({
  src: "../fonts/outfit.woff2",
  weight: "100 900",
  variable: "--font-outfit",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "WBSK", template: "%s | WBSK" },
  description: "Wedding films and photographs by Weddings By Siddhant Kapoor.",
  robots: isProduction ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1F1914" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const social = await getSocialLinks();
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${playfairItalic.variable} ${cormorant.variable} ${cormorantItalic.variable} ${outfit.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Photos all come from here, so the connection is ready before the first one is asked for. */}
        <link rel="preconnect" href="https://cdn.sanity.io" />
        <script dangerouslySetInnerHTML={{ __html: introDecisionScript(publicAsset("")) }} />
      </head>
      <body>
        <SiteShell social={social}>{children}</SiteShell>
      </body>
    </html>
  );
}
