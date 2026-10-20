// The installable "Shopper" app for sellers (the dashboard). Served as a route
// rather than app/manifest.ts on purpose: that convention links the manifest
// from every page, including merchants' storefronts, where an "Install
// Shopper" prompt would confuse their customers. Only the seller-facing
// layouts link this one (see SELLER_APP_METADATA in src/components/pwa).
export function GET() {
  const manifest = {
    id: "/dashboard",
    name: "Shopper — Seller dashboard",
    short_name: "Shopper",
    description: "Run your online store: orders, products, payments and more.",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#007a3f",
    categories: ["business", "shopping", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Orders", url: "/dashboard/orders", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Add a product", short_name: "Add product", url: "/dashboard/products/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Products", url: "/dashboard/products", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
