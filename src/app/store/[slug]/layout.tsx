import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";

import {
  getPublicStoreBySlug,
  getPublicStoreCategories,
  getPublicStorePolicies,
  getPublicNavItems,
} from "@/modules/storefront/services/storefront-service";
import { CartProvider } from "@/components/storefront/cart/cart-context";
import { CartDrawer } from "@/components/storefront/cart/cart-drawer";
import { StorefrontHeader } from "@/components/storefront/header";
import { StorefrontFooter } from "@/components/storefront/footer";
import { JsonLd } from "@/components/seo/json-ld";
import { buildStoreSchema } from "@/lib/structured-data";
import { getStorePlan } from "@/modules/subscriptions/services/subscription-service";

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);

  if (!store) {
    return { title: "Store Not Found" };
  }

  return {
    title: {
      template: `%s | ${store.name}`,
      default: store.name,
    },
    description: store.description ?? `Welcome to ${store.name}`,
    icons: store.logoUrl ? [{ url: store.logoUrl }] : undefined,
  };
}

export default async function StorefrontLayout({
  children,
  params,
}: StoreLayoutProps) {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);

  if (!store) {
    notFound();
  }

  // Suspended by a platform admin: nothing is deleted, the store just
  // isn't browsable or orderable until it's reinstated.
  if (store.suspendedAt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background px-4 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{store.name} is temporarily unavailable</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This store isn&apos;t taking orders right now. Please check back later.
        </p>
      </div>
    );
  }

  const [categories, policies, navItems, storePlan] = await Promise.all([
    getPublicStoreCategories(store.id),
    getPublicStorePolicies(store.id),
    getPublicNavItems(store.id),
    getStorePlan(store.id),
  ]);
  // "Powered by Shopper" is hidden exactly when the plan includes it.
  const footerStore = { ...store, poweredByHidden: storePlan.limits.hideBranding };

  return (
    <div
      className="min-flex flex-col min-h-screen bg-background text-foreground antialiased"
      style={
        {
          "--store-primary": store.primaryColor || "#16a34a",
          "--store-secondary": store.secondaryColor || "#111827",
        } as React.CSSProperties
      }
    >
      <JsonLd data={buildStoreSchema(store)} />
      <CartProvider
        storeSlug={store.slug}
        storeName={store.name}
        currencySymbol={store.currencySymbol}
        whatsappNumber={store.whatsappNumber}
        whatsappEnabled={store.whatsappEnabled}
      >
        {/* Unpublished Draft Mode Notice */}
        {!store.isPublished && (
          <div className="bg-warning/15 border-b border-warning/30 px-4 py-2 text-center text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            <span>This store is currently in draft preview mode and not yet published.</span>
          </div>
        )}

        <StorefrontHeader store={store} categories={categories} navItems={navItems} />

        <main className="flex-1">{children}</main>

        <CartDrawer />

        <StorefrontFooter store={footerStore} policies={policies} navItems={navItems} />
      </CartProvider>
    </div>
  );
}
