import "server-only";
import { eq, and, inArray, count } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { products, productImages, productVariants, productCategories, categories } from "@/db/schema";
import { productSchema, slugify, type ProductInput } from "../validation/schemas";
import { importRowSchema, MAX_IMPORT_ROWS } from "../import/csv";
import { PLANS } from "@/modules/subscriptions/plans";
import {
  assertCanAddProduct,
  getStorePlan,
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

// --- Bulk import (spreadsheet) -------------------------------------------------

function uniqueSlug(base: string, taken: Set<string>, fallback: string) {
  const root = (slugify(base) || fallback).slice(0, 110).replace(/-+$/, "") || fallback;
  let slug = root;
  for (let n = 2; taken.has(slug); n++) slug = `${root}-${n}`;
  taken.add(slug);
  return slug;
}

/**
 * Creates many products at once from a checked spreadsheet (see
 * modules/products/import/csv.ts). All-or-nothing: either every row is saved
 * or none are. Categories named in the file are matched to existing ones by
 * name (ignoring case) and created if missing. Product URLs are generated
 * from names and made unique ("ankara-dress", "ankara-dress-2", ...).
 */
export async function importProducts(storeId: string, input: unknown, publish: boolean) {
  const parsed = z.array(importRowSchema).min(1).max(MAX_IMPORT_ROWS).safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ProductServiceError(
      issue ? `Row problem: ${issue.message}` : "Nothing to import"
    );
  }
  const rows = parsed.data;

  const { limits, plan } = await getStorePlan(storeId);
  if (limits.maxProducts !== null) {
    const [{ value: existing }] = await db
      .select({ value: count() })
      .from(products)
      .where(eq(products.storeId, storeId));
    const room = Math.max(0, limits.maxProducts - existing);
    if (rows.length > room) {
      throw new ProductServiceError(
        `The ${PLANS[plan].name} plan allows up to ${limits.maxProducts} products and you have ${existing}, ` +
          `so you can import ${room} more. Remove ${rows.length - room} row(s) from the file, or upgrade under Billing.`
      );
    }
  }

  return db.transaction(async (tx) => {
    const takenProductSlugs = new Set(
      (await tx.select({ slug: products.slug }).from(products).where(eq(products.storeId, storeId))).map((r) => r.slug)
    );

    // Categories: match by name, create the missing ones.
    const existingCategories = await tx
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories)
      .where(eq(categories.storeId, storeId));
    const categoryByName = new Map(existingCategories.map((c) => [c.name.trim().toLowerCase(), c.id]));
    const takenCategorySlugs = new Set(existingCategories.map((c) => c.slug));
    let createdCategories = 0;
    for (const name of new Set(rows.flatMap((r) => r.categories))) {
      const key = name.toLowerCase();
      if (categoryByName.has(key)) continue;
      const [created] = await tx
        .insert(categories)
        .values({ storeId, name, slug: uniqueSlug(name, takenCategorySlugs, "category") })
        .returning({ id: categories.id });
      categoryByName.set(key, created.id);
      createdCategories++;
    }

    const created = await tx
      .insert(products)
      .values(
        rows.map((r) => ({
          storeId,
          name: r.name,
          slug: uniqueSlug(r.name, takenProductSlugs, "product"),
          description: r.description || null,
          status: r.status ?? (publish ? ("ACTIVE" as const) : ("DRAFT" as const)),
          brand: r.brand || null,
          tags: r.tags,
          price: String(r.price),
          compareAtPrice: toNumericString(r.compareAtPrice),
          sku: r.sku || null,
          trackInventory: true,
          inventoryQuantity: r.stock,
        }))
      )
      .returning({ id: products.id, name: products.name, status: products.status });

    const links = rows.flatMap((r, i) =>
      [...new Set(r.categories.map((c) => categoryByName.get(c.toLowerCase())!))].map((categoryId) => ({
        productId: created[i].id,
        categoryId,
      }))
    );
    if (links.length > 0) await tx.insert(productCategories).values(links);

    return { products: created, createdCategories };
  });
}

export async function countProducts(storeId: string) {
  const [{ value }] = await db.select({ value: count() }).from(products).where(eq(products.storeId, storeId));
  return value;
}

// --- Bulk photos ---------------------------------------------------------------

const bulkImagesSchema = z
  .array(z.object({ productId: z.string().min(1), url: z.string().url() }))
  .min(1)
  .max(200);

/**
 * Appends already-uploaded photos (via /api/uploads) to products, from the
 * bulk photo page. A product with no photos yet gets its first new one as
 * the main photo. Only this store's products and this store's uploads are
 * accepted.
 */
export async function addProductImagesBulk(storeId: string, input: unknown) {
  const parsed = bulkImagesSchema.safeParse(input);
  if (!parsed.success) throw new ProductServiceError("Nothing to add");
  const items = parsed.data;

  if (items.some((i) => !i.url.includes(`/stores/${storeId}/products/`))) {
    throw new ProductServiceError("Photos must be uploaded to this store first");
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const owned = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.storeId, storeId), inArray(products.id, productIds)));
  if (owned.length !== productIds.length) throw new ProductServiceError("Product not found");

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ productId: productImages.productId, position: productImages.position })
      .from(productImages)
      .where(inArray(productImages.productId, productIds));
    const nextPosition = new Map<string, number>();
    for (const img of existing) {
      nextPosition.set(img.productId, Math.max(nextPosition.get(img.productId) ?? 0, img.position + 1));
    }

    const rows = items.map((item) => {
      const hasImages = nextPosition.has(item.productId);
      const position = nextPosition.get(item.productId) ?? 0;
      nextPosition.set(item.productId, position + 1);
      return { productId: item.productId, url: item.url, position, isPrimary: !hasImages };
    });
    await tx.insert(productImages).values(rows);
    await tx.update(products).set({ updatedAt: new Date() }).where(inArray(products.id, productIds));
    return { added: rows.length, products: productIds.length };
  });
}
