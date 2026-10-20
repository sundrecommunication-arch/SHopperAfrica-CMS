import type { Metadata, Viewport } from "next";

// Metadata that makes the seller-facing pages installable as the "Shopper"
// app (manifest: src/app/manifest.webmanifest). Spread into the metadata of
// the dashboard, onboarding, supplier and marketing layouts -- never the
// storefronts, which belong to merchants' customers.
export const SELLER_APP_METADATA: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Shopper", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const SELLER_APP_VIEWPORT: Viewport = { themeColor: "#007a3f" };
