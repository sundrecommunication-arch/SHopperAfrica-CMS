import { NextResponse } from "next/server";

import {
  getPublicStoreBySlug,
  getPublicStoreCategories,
  getPublicStoreProducts,
} from "@/modules/storefront/services/storefront-service";

/**
 * Serves /store/[slug]/llms.txt — a plain-text summary AI assistants
 * (ChatGPT, Claude, Perplexity, Gemini) can read to understand what a store
 * sells, following the emerging llms.txt convention. A merchant can override
 * this from the dashboard's "SEO & Optimisation" settings card; otherwise
 * it's generated automatically so every store has one with zero setup.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);

  if (!store) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (store.llmsTxt?.trim()) {
    return new NextResponse(store.llmsTxt, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const storeUrl =
    store.customDomain && store.domainVerified
      ? `https://${store.customDomain}`
      : `${appUrl}/store/${store.slug}`;

  const [categories, products] = await Promise.all([
    getPublicStoreCategories(store.id),
    getPublicStoreProducts(store.id, { limit: 50 }),
  ]);

  const lines: string[] = [
    `# ${store.name}`,
    "",
    store.description?.trim() || `${store.name} is an online store built with Shopper.`,
    "",
    `Website: ${storeUrl}`,
  ];

  if (store.contactEmail) lines.push(`Contact: ${store.contactEmail}`);
  if (store.whatsappEnabled && store.whatsappNumber) lines.push(`WhatsApp: ${store.whatsappNumber}`);
  if (store.addressText) lines.push(`Location: ${store.addressText}`);

  if (categories.length > 0) {
    lines.push("", "## Categories", ...categories.map((c) => `- ${c.name}`));
  }

  if (products.length > 0) {
    lines.push(
      "",
      "## Products",
      ...products.map((p) => `- ${p.name}: ${storeUrl}/products/${p.slug}`)
    );
  }

  return new NextResponse(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
