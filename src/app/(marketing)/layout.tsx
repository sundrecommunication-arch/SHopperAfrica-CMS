import type { Metadata } from "next";

import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: {
    template: "%s | Shopper",
    default: "Shopper — The free e-commerce website builder for Africa",
  },
  description:
    "Shopper is a free e-commerce website builder for African business owners who sell online — a real alternative to WordPress, Wix, Bumpa, Shopify, and every other e-commerce platform used in Africa. Built to be found on Google, AI search, and every ad platform.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Scoped to the marketing pages only, so the rest of the app (dashboard,
          storefronts) is untouched. Fraunces for headings, Work Sans for body —
          a warmer, more editorial pairing than the default UI font. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500&family=Work+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div
        className="flex min-h-screen flex-col bg-background text-foreground"
        style={
          {
            "--font-marketing-display": "'Fraunces', ui-serif, Georgia, serif",
          } as React.CSSProperties
        }
      >
        <MarketingNav />
        <main className="flex-1" style={{ fontFamily: "'Work Sans', ui-sans-serif, system-ui, sans-serif" }}>
          {children}
        </main>
        <MarketingFooter />
      </div>
    </>
  );
}
