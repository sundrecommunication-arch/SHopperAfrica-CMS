import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
// usually matters most.
const heroOverlayAlignClasses: Record<string, string> = {
  center: "items-center justify-center",
  "bottom-left": "items-end justify-start",
  "bottom-center": "items-end justify-center",
  "bottom-right": "items-end justify-end",
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

  const whatsappPhone = store.whatsappNumber ? formatWhatsAppPhone(store.whatsappNumber) : null;
  const heroTextPosition = store.heroTextPosition ?? "bottom-center";

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-10">
      {/* Storefront Hero / Slider */}
      <div className="relative">
        {/* Import HeroSlider component */}
        <section className="relative w-full h-64 md:h-96 overflow-hidden rounded-2xl">
          <HeroSlider
            images={
              store.heroImages && store.heroImages.length > 0
                ? store.heroImages
                : ["/placeholder-hero1.jpg", "/placeholder-hero2.jpg", "/placeholder-hero3.jpg"]
            }
          />
        </section>
        {/* Optional overlay content (store name, description, WhatsApp) — off
            by default (see store.heroShowText) since a merchant's hero
            images often already carry their own text/branding. When it's on,
            it's anchored per store.heroTextPosition rather than dead-center,
            so it never sits on top of the middle of the image. */}
        {store.heroShowText && (
          <section
            className={`pointer-events-none absolute inset-0 flex p-4 sm:p-8 ${heroOverlayAlignClasses[heroTextPosition]}`}
          >
            <div
              className={`space-y-3 rounded-2xl bg-background/85 px-5 py-4 backdrop-blur-sm sm:space-y-4 sm:px-6 sm:py-5 ${
                heroTextPosition === "center" ? "max-w-3xl text-center" : "max-w-md text-left"
              }`}
            >
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                {store.name}
              </h1>

              {store.description && (
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {store.description}
                </p>
              )}

              {store.whatsappEnabled && whatsappPhone && (
                <a
                  href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Hello ${store.name}, I would like to make an inquiry!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--store-primary)] hover:brightness-90 text-white px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all shadow-xs pointer-events-auto"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat with us on WhatsApp
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
              {searchQuery ? `Search results for "${searchQuery}"` : "All Products"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse our complete catalog with direct WhatsApp ordering
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
