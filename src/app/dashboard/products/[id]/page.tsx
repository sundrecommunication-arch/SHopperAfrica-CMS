import { notFound } from "next/navigation";
import { getCurrentStore } from "@/lib/tenant";
import { getProductForEdit } from "@/modules/products/services/product-service";
import { listCategories } from "@/modules/categories/services/category-service";
import { ProductForm } from "@/components/dashboard/products/product-form";
import type { ProductInput } from "@/modules/products/validation/schemas";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store } = await getCurrentStore();
  const [result, categories] = await Promise.all([
    getProductForEdit(store.id, id),
    listCategories(store.id),
  ]);

  if (!result) {
    notFound();
  }

  const { product, images, variants, categoryIds } = result;

  const initial: ProductInput = {
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    status: product.status,
    productType: product.productType ?? "",
    brand: product.brand ?? "",
    tags: product.tags ?? [],
    price: Number(product.price),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    sku: product.sku ?? "",
    weight: product.weight ? Number(product.weight) : null,
    trackInventory: product.trackInventory,
    inventoryQuantity: product.inventoryQuantity,
    allowBackorder: product.allowBackorder,
    lowStockThreshold: product.lowStockThreshold,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    categoryIds,
    images: images.map((img) => ({ id: img.id, url: img.url, isPrimary: img.isPrimary })),
    variants: variants.map((v) => ({
      id: v.id,
      name: v.name,
      options: v.options,
      sku: v.sku ?? "",
      price: v.price ? Number(v.price) : null,
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
      inventoryQuantity: v.inventoryQuantity,
      imageUrl: v.imageUrl ?? "",
    })),
  };

  return (
    <ProductForm
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      initial={initial}
      productId={id}
    />
  );
}
