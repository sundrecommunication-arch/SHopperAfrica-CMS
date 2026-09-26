import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ChevronRight, Folder } from "lucide-react";

import {
  getPublicStoreBySlug,
  getPublicStoreCategories,
  getPublicStoreProducts,
} from "@/modules/storefront/services/storefront-service";
import { ProductGrid } from "@/components/storefront/product-grid";

interface CategoryPageProps {
  params: Promise<{ slug: string; categorySlug: string }>;
  searchParams: Promise<{ sort?: "newest" | "price_asc" | "price_desc" | "name" }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; categorySlug: string }>;
}): Promise<Metadata> {
  const { slug, categorySlug } = await params;
  const store = await getPublicStoreBySlug(slug);
  if (!store) return { title: "Store Not Found" };

  const categories = await getPublicStoreCategories(store.id);
  const currentCategory = categories.find((c) => c.slug === categorySlug);

  if (!currentCategory) return { title: "Category Not Found" };

  return {
    title: currentCategory.name,
    description: currentCategory.description ?? `Browse ${currentCategory.name} from ${store.name}`,
  };
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug, categorySlug } = await params;
  const { sort: sortParam } = await searchParams;

  const store = await getPublicStoreBySlug(slug);
  if (!store) {
    notFound();
  }

  const [categories, products] = await Promise.all([
    getPublicStoreCategories(store.id),
    getPublicStoreProducts(store.id, {
      categorySlug,
      sort: sortParam,
    }),
  ]);

  const currentCategory = categories.find((c) => c.slug === categorySlug);
  if (!currentCategory) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href={`/store/${store.slug}`} className="hover:text-foreground transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{currentCategory.name}</span>
      </nav>

      {/* Category Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 rounded-2xl border bg-muted/30 p-6 sm:p-8">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Category
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {currentCategory.name}
          </h1>
          {currentCategory.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentCategory.description}
            </p>
          )}
        </div>

        {currentCategory.imageUrl && (
          <div className="relative h-24 w-24 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-xl border bg-background">
            <Image
              src={currentCategory.imageUrl}
              alt={currentCategory.name}
              fill
              className="object-cover"
              sizes="128px"
            />
          </div>
        )}
      </div>

      {/* Category Products */}
      <ProductGrid
        products={products}
        categories={categories}
        storeSlug={store.slug}
        currencySymbol={store.currencySymbol}
        initialCategorySlug={currentCategory.slug}
      />
    </div>
  );
}

