import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStorefrontI18n } from "@/i18n/server";
import { MessageCircle } from "lucide-react";
import { HeroSlider } from "@/components/storefront/hero-slider";
import { buildStoreMetadata } from "@/components/seo/StoreSeo";
import {
  getPublicStoreBySlug,
  getPublicStoreCategories,
  getPublicStoreProducts,
  getPublicStoreDefaultFaqs,
} from "@/modules/storefront/services/storefront-service";
import { ProductGrid } from "@/components/storefront/product-grid";
import { FaqSection } from "@/components/storefront/faq-section";
import { formatWhatsAppPhone } from "@/modules/storefront/utils/whatsapp";

interface StorefrontPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; sort?: "newest" | "price_asc" | "price_desc" | "name" }>;
}

// Maps a store's chosen hero text position to the flexbox alignment classes
// that place the overlay card within the hero — "bottom-*" options keep the
// text clear of the middle of the image, where the product photography
// usually matters most. sm: and up only: on phones the card sits below the
// banner instead, since overlaid it would cover almost the whole image.
const heroOverlayAlignClasses: Record<string, string> = {
  center: "sm:items-center sm:justify-center",
  "bottom-left": "sm:items-end sm:justify-start",
  "bottom-center": "sm:items-end sm:justify-center",
  "bottom-right": "sm:items-end sm:justify-end",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);
  if (!store) return {};
  return buildStoreMetadata(store);
}

export default async function StorefrontPage({
  params,
  searchParams,
}: StorefrontPageProps) {
  const { slug } = await params;
  const { q: searchQuery, sort: sortParam } = await searchParams;

  const store = await getPublicStoreBySlug(slug);
  if (!store) {
    notFound();
  }

  const [categories, products, faqs] = await Promise.all([
    getPublicStoreCategories(store.id),
    getPublicStoreProducts(store.id, {
      search: searchQuery,
      sort: sortParam,
    }),
    getPublicStoreDefaultFaqs(store.id),
  ]);

  const { t } = await getStorefrontI18n(store.locale);
  const whatsappPhone = store.whatsappNumber ? formatWhatsAppPhone(store.whatsappNumber) : null;
  const heroTextPosition = store.heroTextPosition ?? "bottom-center";

  return (
    <div className="container mx-auto max-w-7xl space-y-8 px-4 py-4 sm:space-y-10 sm:px-6 sm:py-8">
      {/* Storefront Hero / Slider */}
      <div className="relative">
        <section className="relative h-48 w-full overflow-hidden rounded-2xl min-[400px]:h-56 sm:h-72 md:h-96">
          {store.heroImages && store.heroImages.length > 0 ? (
            <HeroSlider images={store.heroImages} label={store.name} />
          ) : (
            // No banner uploaded yet: a panel in the store's own colour
            // rather than an empty/broken image.
            <div
              className="flex h-full w-full items-center justify-center px-6 text-center"
              style={{
                background:
                  "linear-gradient(135deg, var(--store-primary), color-mix(in srgb, var(--store-primary) 55%, black))",
              }}
            >
              {!store.heroShowText && (
                <p className="text-2xl font-extrabold tracking-tight text-white drop-shadow sm:text-4xl">
                  {store.name}
                </p>
              )}
            </div>
          )}
        </section>
        {/* Optional store name, description and WhatsApp button — off by
            default (see store.heroShowText) since a merchant's hero images
            often already carry their own text/branding. From sm: up it's
            overlaid, anchored per store.heroTextPosition rather than
            dead-center; on phones it's a card under the banner. */}
        {store.heroShowText && (
          <section
            className={`mt-3 sm:pointer-events-none sm:absolute sm:inset-0 sm:mt-0 sm:flex sm:p-8 ${heroOverlayAlignClasses[heroTextPosition]}`}
          >
            <div
              className={`space-y-2.5 rounded-2xl border bg-card px-4 py-4 sm:space-y-4 sm:border-0 sm:bg-background/85 sm:px-6 sm:py-5 sm:backdrop-blur-sm ${
                heroTextPosition === "center" ? "text-center sm:max-w-3xl" : "text-left sm:max-w-md"
              }`}
            >
              <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                {store.name}
              </h1>

              {store.description && (
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:line-clamp-none sm:text-base">
                  {store.description}
                </p>
              )}

              {store.whatsappEnabled && whatsappPhone && (
                <a
                  href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(t("store.whatsappInquiry", { store: store.name }))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--store-primary)] px-5 py-3 text-sm font-semibold text-white shadow-xs transition-all hover:brightness-90 sm:inline-flex sm:w-auto sm:py-2.5"
                >
                  <MessageCircle className="h-4 w-4" />
                  {t("header.chatOnWhatsapp")}
                </a>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Catalog & Product Grid Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {searchQuery ? t("store.searchResultsFor", { query: searchQuery }) : t("common.allProducts")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("store.catalogSubtitle")}
            </p>
          </div>
        </div>

        <ProductGrid
          products={products}
          categories={categories}
          storeSlug={store.slug}
          currencySymbol={store.currencySymbol}
          initialSearchQuery={searchQuery}
        />
      </section>

      {/* FAQs */}
      {faqs.length > 0 && <FaqSection faqs={faqs} />}
    </div>
  );
}
