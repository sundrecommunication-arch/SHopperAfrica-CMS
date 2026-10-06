import "server-only";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { products, productImages, productVariants, productCategories } from "@/db/schema";
import { productSchema, type ProductInput } from "../validation/schemas";
import {
  assertCanAddProduct,
  SubscriptionServiceError,
} from "@/modules/subscriptions/services/subscription-service";

export class ProductServiceError extends Error {}

function toNumericString(value: number | null | undefined) {
  return value === null || value === undefined ? null : String(value);
}

async function assertUniqueSlug(storeId: string, slug: string, excludeProductId?: string) {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.slug, slug)));
  if (rows.some((r) => r.id !== excludeProductId)) {
    throw new ProductServiceError("That product URL is already in use");
  }
}

function parseInput(input: ProductInput) {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    throw new ProductServiceError(parsed.error.issues[0]?.message ?? "Invalid product data");
  }
  return parsed.data;
}

/**
 * A product with options (variants) has no stock of its own -- its stock is
 * the total across its options. Storing that total on the product keeps every
 * place that reads products.inventoryQuantity (cards, dashboard, SEO data) in
 * agreement with what's actually orderable.
 */
function totalStock(data: { inventoryQuantity: number; variants: { inventoryQuantity: number }[] }) {
  return data.variants.length > 0
    ? data.variants.reduce((sum, v) => sum + v.inventoryQuantity, 0)
    : data.inventoryQuantity;
}

export async function createProduct(storeId: string, input: ProductInput) {
  const data = parseInput(input);
  await assertUniqueSlug(storeId, data.slug);
  try {
    await assertCanAddProduct(storeId);
  } catch (error) {
    if (error instanceof SubscriptionServiceError) throw new ProductServiceError(error.message);
    throw error;
  }

  return db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({
        storeId,
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        status: data.status,
        productType: data.productType || null,
        brand: data.brand || null,
        tags: data.tags,
        price: String(data.price),
        compareAtPrice: toNumericString(data.compareAtPrice),
        sku: data.sku || null,
        weight: toNumericString(data.weight),
        trackInventory: data.trackInventory,
        inventoryQuantity: totalStock(data),
        allowBackorder: data.allowBackorder,
        lowStockThreshold: data.lowStockThreshold,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
      })
      .returning();

    if (data.images.length > 0) {
      await tx.insert(productImages).values(
        data.images.map((img, index) => ({
          productId: product.id,
          url: img.url,
          position: index,
          isPrimary: img.isPrimary,
        }))
      );
    }
    if (data.variants.length > 0) {
      await tx.insert(productVariants).values(
        data.variants.map((v) => ({
          productId: product.id,
          name: v.name,
          options: v.options,
          sku: v.sku || null,
          price: toNumericString(v.price),
          compareAtPrice: toNumericString(v.compareAtPrice),
          inventoryQuantity: v.inventoryQuantity,
          imageUrl: v.imageUrl || null,
        }))
      );
    }
    if (data.categoryIds.length > 0) {
      await tx
        .insert(productCategories)
        .values(data.categoryIds.map((categoryId) => ({ productId: product.id, categoryId })));
    }

    return product;
  });
}

export async function updateProduct(storeId: string, productId: string, input: ProductInput) {
  const data = parseInput(input);
  await assertUniqueSlug(storeId, data.slug, productId);

  return db.transaction(async (tx) => {
    const [product] = await tx
      .update(products)
      .set({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        status: data.status,
        productType: data.productType || null,
        brand: data.brand || null,
        tags: data.tags,
        price: String(data.price),
        compareAtPrice: toNumericString(data.compareAtPrice),
        sku: data.sku || null,
        weight: toNumericString(data.weight),
        trackInventory: data.trackInventory,
        inventoryQuantity: totalStock(data),
        allowBackorder: data.allowBackorder,
        lowStockThreshold: data.lowStockThreshold,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
      .returning();

    if (!product) {
      throw new ProductServiceError("Product not found");
    }

    // Images/variants/categories are replaced wholesale on every save. This
    // is the simplest correct approach for now (rule 71.4) — it means
    // variant ids are not stable across edits, which is fine until checkout
    // (phase 5) needs to reference a specific variant id long-term.
    await tx.delete(productImages).where(eq(productImages.productId, productId));
    await tx.delete(productVariants).where(eq(productVariants.productId, productId));
    await tx.delete(productCategories).where(eq(productCategories.productId, productId));

    if (data.images.length > 0) {
      await tx.insert(productImages).values(
        data.images.map((img, index) => ({
          productId,
          url: img.url,
          position: index,
          isPrimary: img.isPrimary,
        }))
      );
    }
    if (data.variants.length > 0) {
      await tx.insert(productVariants).values(
        data.variants.map((v) => ({
          productId,
          name: v.name,
          options: v.options,
          sku: v.sku || null,
          price: toNumericString(v.price),
          compareAtPrice: toNumericString(v.compareAtPrice),
          inventoryQuantity: v.inventoryQuantity,
          imageUrl: v.imageUrl || null,
        }))
      );
    }
    if (data.categoryIds.length > 0) {
      await tx
        .insert(productCategories)
        .values(data.categoryIds.map((categoryId) => ({ productId, categoryId })));
    }

    return product;
  });
}

export async function updateProductStatus(
  storeId: string,
  productId: string,
  status: ProductInput["status"]
) {
  const [product] = await db
    .update(products)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
    .returning();
  if (!product) {
    throw new ProductServiceError("Product not found");
  }
  return product;
}

export async function deleteProduct(storeId: string, productId: string) {
  const [deleted] = await db
    .delete(products)
    .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
    .returning({ id: products.id });
  if (!deleted) {
    throw new ProductServiceError("Product not found");
  }
  return deleted;
}

export async function listProducts(storeId: string) {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.storeId, storeId))
    .orderBy(products.createdAt);

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const images = await db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, ids));

  const imagesByProduct = new Map<string, typeof images>();
  for (const img of images) {
    const list = imagesByProduct.get(img.productId) ?? [];
    list.push(img);
    imagesByProduct.set(img.productId, list);
  }

  return rows.map((product) => {
    const productImageList = (imagesByProduct.get(product.id) ?? []).sort(
      (a, b) => a.position - b.position
    );
    const primary = productImageList.find((i) => i.isPrimary) ?? productImageList[0];
    return { ...product, primaryImageUrl: primary?.url ?? null };
  });
}

export async function getProductForEdit(storeId: string, productId: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
    .limit(1);
  if (!product) return null;

  const [images, variants, categoryLinks] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(productImages.position),
    db.select().from(productVariants).where(eq(productVariants.productId, productId)),
    db
      .select({ categoryId: productCategories.categoryId })
      .from(productCategories)
      .where(eq(productCategories.productId, productId)),
  ]);

  return { product, images, variants, categoryIds: categoryLinks.map((c) => c.categoryId) };
}
