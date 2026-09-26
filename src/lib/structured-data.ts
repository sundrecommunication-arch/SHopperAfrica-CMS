/**
 * Builders for the schema.org JSON-LD blocks rendered on public storefront
 * pages (via src/components/seo/json-ld.tsx). This is the core of "zero
 * effort" SEO/AEO/GEO for merchants: every store and product page gets
 * complete, correct structured data automatically from the data already in
 * the product/store forms — nobody has to hand-write markup or fill in a
 * separate "SEO" screen for it to work.
 */

interface StoreForSchema {
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  addressText?: string | null;
}

function absoluteUrl(path: string): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${appUrl}${path}`;
}

export function buildStoreSchema(store: StoreForSchema) {
  const url = absoluteUrl(`/store/${store.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: store.name,
    url,
    ...(store.logoUrl ? { logo: store.logoUrl, image: store.logoUrl } : {}),
    ...(store.description ? { description: store.description } : {}),
    ...(store.contactEmail ? { email: store.contactEmail } : {}),
    ...(store.contactPhone ? { telephone: store.contactPhone } : {}),
    ...(store.addressText
      ? { address: { "@type": "PostalAddress", streetAddress: store.addressText } }
      : {}),
  };
}

interface ProductForSchema {
  name: string;
  slug: string;
  description?: string | null;
  brand?: string | null;
  sku?: string | null;
  price: string;
  trackInventory: boolean;
  inventoryQuantity: number;
  allowBackorder: boolean;
  images: { url: string }[];
}

export function buildProductSchema(
  product: ProductForSchema,
  store: { slug: string; currency: string; name: string }
) {
  const url = absoluteUrl(`/store/${store.slug}/products/${product.slug}`);
  const inStock =
    !product.trackInventory || product.inventoryQuantity > 0 || product.allowBackorder;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    ...(product.description ? { description: product.description } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.images.length > 0 ? { image: product.images.map((i) => i.url) } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: store.currency,
      price: product.price,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: store.name },
    },
  };
}
