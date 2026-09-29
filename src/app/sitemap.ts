import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { stores, products, categories } from "@/db/schema";

/**
 * Auto-generated sitemap — Next's native App Router convention (this file
 * is served at /sitemap.xml with zero manual config). It enumerates every
 * *published* store and its *active* products/categories, so a merchant
 * gets full SEO coverage the moment they publish a store or a product —
 * nothing to fill in, nothing to remember to update. It also lists the
 * platform's own marketing pages (src/app/(marketing)) so they're indexed too.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const publishedStores = await db
    .select({ id: stores.id, slug: stores.slug, updatedAt: stores.updatedAt })
    .from(stores)
    .where(eq(stores.isPublished, true));

  const entries: MetadataRoute.Sitemap = [
    { url: appUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${appUrl}/features`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${appUrl}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${appUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  for (const store of publishedStores) {
    const storeUrl = `${appUrl}/store/${store.slug}`;
    entries.push({
      url: storeUrl,
      lastModified: store.updatedAt,
      changeFrequency: "daily",
      priority: 0.9,
    });

    const [storeProducts, storeCategories] = await Promise.all([
      db
        .select({ slug: products.slug, updatedAt: products.updatedAt })
        .from(products)
        .where(and(eq(products.storeId, store.id), eq(products.status, "ACTIVE"))),
      db
        .select({ slug: categories.slug, updatedAt: categories.updatedAt })
        .from(categories)
        .where(eq(categories.storeId, store.id)),
    ]);

    for (const product of storeProducts) {
      entries.push({
        url: `${storeUrl}/products/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    for (const category of storeCategories) {
      entries.push({
        url: `${storeUrl}/categories/${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
