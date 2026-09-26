import type { Metadata } from "next";

export interface StoreSeoInput {
  name: string;
  slug: string;
  description?: string | null;
  customDomain?: string | null;
  domainVerified?: boolean | null;
  locale?: string | null;
}

/**
 * Builds page metadata for a public storefront page.
 *
 * This used to be a component that rendered `next/head`'s `<Head>` tag, but
 * `next/head` is a Pages-Router-only API — it relies on React context/hooks
 * that Server Components (the whole `src/app` tree here) can't use, so
 * rendering it crashed every visit to `/store/[slug]`. The App Router's
 * equivalent is the `generateMetadata` export on the page, which is why this
 * is now a plain function that returns a `Metadata` object instead of JSX.
 * See src/app/store/[slug]/page.tsx for the call site.
 */
export function buildStoreMetadata(store: StoreSeoInput): Metadata {
  const title = `${store.name} – ${store.slug}`;
  const description = store.description ?? undefined;
  const url =
    store.customDomain && store.domainVerified
      ? `https://${store.customDomain}`
      : `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/store/${store.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
    },
    alternates: {
      canonical: url,
      ...(store.locale ? { languages: { [store.locale]: url } } : {}),
    },
  };
}
