import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  getPublicStoreBySlug,
  getPublicProductBySlug,
  getPublicRelatedProducts,
  getPublicFaqsForProduct,
} from "@/modules/storefront/services/storefront-service";
import { ProductView } from "@/components/storefront/product-view";
import { JsonLd } from "@/components/seo/json-ld";
import { buildProductSchema } from "@/lib/structured-data";

interface ProductPageProps {
  params: Promise<{ slug: string; productSlug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const store = await getPublicStoreBySlug(slug);
  if (!store) return { title: "Store Not Found" };

  const product = await getPublicProductBySlug(store.id, productSlug);
  if (!product) return { title: "Product Not Found" };

  const primaryImg = product.images.find((i) => i.isPrimary) ?? product.images[0];

  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.description || `Buy ${product.name} from ${store.name}`,
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: primaryImg ? [{ url: primaryImg.url }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug, productSlug } = await params;

  const store = await getPublicStoreBySlug(slug);
  if (!store) {
    notFound();
  }

  const product = await getPublicProductBySlug(store.id, productSlug);
  if (!product) {
    notFound();
  }

  const categoryIds = product.categories.map((c) => c.id);
  const [relatedProducts, faqs] = await Promise.all([
    getPublicRelatedProducts(store.id, product.id, categoryIds, 4),
    getPublicFaqsForProduct(store.id, product.id),
  ]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <JsonLd data={buildProductSchema(product, store)} />
      <ProductView
        product={product}
        relatedProducts={relatedProducts}
        faqs={faqs}
        store={store}
        currencySymbol={store.currencySymbol}
      />
    </div>
  );
}

