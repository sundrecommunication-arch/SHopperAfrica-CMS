import type { Metadata } from "next";

export interface StoreSeoInput {
  name: string;
  slug: string;
  description?: string | null;
  customDomain?: string | null;
  domainVerified?: boolean | null;
  locale?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  searchConsoleVerification?: string | null;
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
 *
 * `metaTitle`/`metaDescription` are the merchant's own overrides from the
 * dashboard's "SEO & Optimisation" settings card — when left blank, a
 * reasonable default is generated from the store's name and description so
 * every store gets baseline SEO with zero setup.
 */
export function buildStoreMetadata(store: StoreSeoInput): Metadata {
  const title = store.metaTitle?.trim() || `${store.name} – ${store.slug}`;
  const description = store.metaDescription?.trim() || store.description || undefined;
  const url =
    store.customDomain && store.domainVerified
      ? `https://${store.customDomain}`
      : `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/store/${store.slug}`;

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
    ...(store.searchConsoleVerification?.trim()
      ? { verification: { google: store.searchConsoleVerification.trim() } }
      : {}),
  };
}
