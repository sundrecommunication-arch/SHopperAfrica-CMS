import "server-only";
import { and, desc, eq, ilike, or, sql, inArray } from "drizzle-orm";

import { db } from "@/db";
import { products, supplierProducts, supplierProductVariants, suppliers } from "@/db/schema";
import {
  availableProductSlug,
  createProduct,
  ProductServiceError,
} from "@/modules/products/services/product-service";
import { addToStoreSchema } from "../validation/schemas";
import { syncLinkedProducts } from "./supplier-service";
import { estimatePaystackFee } from "../fees";

export class CatalogServiceError extends Error {}

/** Approved suppliers' active, in-stock products, for merchants to browse. */
export async function listCatalog(opts: { search?: string; category?: string; storeId: string }) {
  const term = opts.search?.trim();
  const rows = await db
    .select({
      id: supplierProducts.id,
      name: supplierProducts.name,
      description: supplierProducts.description,
      images: supplierProducts.images,
      category: supplierProducts.category,
      wholesalePrice: supplierProducts.wholesalePrice,
      suggestedPrice: supplierProducts.suggestedPrice,
      stock: supplierProducts.stock,
      supplierName: suppliers.businessName,
      supplierState: suppliers.state,
      deliveryAreas: suppliers.deliveryAreas,
      deliveryDays: suppliers.deliveryDays,
      // e.g. "S, M, L" -- the supplier's options, for the catalog card.
      optionSummary: sql<string | null>`(select string_agg(${supplierProductVariants.name}, ', ' order by ${supplierProductVariants.createdAt}) from ${supplierProductVariants} where ${supplierProductVariants.supplierProductId} = ${supplierProducts.id} and ${supplierProductVariants.stock} > 0)`,
      // This store's copy, if it already added the product.
      inStoreProductId: sql<string | null>`(select ${products.id} from ${products} where ${products.supplierProductId} = ${supplierProducts.id} and ${products.storeId} = ${opts.storeId} limit 1)`,
    })
    .from(supplierProducts)
    .innerJoin(suppliers, eq(suppliers.id, supplierProducts.supplierId))
    .where(
      and(
        eq(suppliers.status, "APPROVED"),
        eq(suppliers.kind, "LOCAL"), // worldwide (CJ) products have their own tab
        eq(supplierProducts.isActive, true),
        sql`${supplierProducts.stock} > 0`,
        opts.category ? eq(supplierProducts.category, opts.category) : undefined,
        term
          ? or(
              ilike(supplierProducts.name, `%${term}%`),
              ilike(supplierProducts.description, `%${term}%`),
              ilike(supplierProducts.category, `%${term}%`)
            )
          : undefined
      )
    )
    .orderBy(desc(supplierProducts.createdAt))
    .limit(300);

  return rows.map((r) => ({
    ...r,
    wholesalePrice: Number(r.wholesalePrice),
    suggestedPrice: r.suggestedPrice ? Number(r.suggestedPrice) : null,
  }));
}

export async function listCatalogCategories() {
  const rows = await db
    .selectDistinct({ category: supplierProducts.category })
    .from(supplierProducts)
    .innerJoin(suppliers, eq(suppliers.id, supplierProducts.supplierId))
    .where(and(eq(suppliers.status, "APPROVED"), eq(suppliers.kind, "LOCAL"), eq(supplierProducts.isActive, true)));
  return rows.map((r) => r.category).filter((c): c is string => Boolean(c)).sort();
}

/**
 * "Add to my store": copies a supplier product into the merchant's catalog
 * (name, description, photos, stock) at the merchant's own selling price,
 * linked back to the supplier so orders and stock flow automatically.
 */
export async function addSupplierProductToStore(storeId: string, input: unknown) {
  const parsed = addToStoreSchema.safeParse(input);
  if (!parsed.success) throw new CatalogServiceError(parsed.error.issues[0]?.message ?? "Check the price");
  const { supplierProductId, price, publish } = parsed.data;

  const [sp] = await db
    .select({ product: supplierProducts, supplierStatus: suppliers.status })
    .from(supplierProducts)
    .innerJoin(suppliers, eq(suppliers.id, supplierProducts.supplierId))
    .where(eq(supplierProducts.id, supplierProductId))
    .limit(1);
  if (!sp || sp.supplierStatus !== "APPROVED" || !sp.product.isActive) {
    throw new CatalogServiceError("This product isn't available any more.");
  }
  const cost = Number(sp.product.wholesalePrice);
  if (price - cost <= estimatePaystackFee(price)) {
    throw new CatalogServiceError(
      `At that price you'd earn nothing after the supplier and Paystack are paid. Set a price above ₦${Math.ceil(cost + estimatePaystackFee(cost) + 1).toLocaleString()}.`
    );
  }

  const [already] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.supplierProductId, supplierProductId)))
    .limit(1);
  if (already) throw new CatalogServiceError("You've already added this product to your store.");

  try {
    const created = await createProduct(storeId, {
      name: sp.product.name,
      slug: await availableProductSlug(storeId, sp.product.name),
      description: sp.product.description ?? "",
      status: publish ? "ACTIVE" : "DRAFT",
      productType: "",
      brand: "",
      tags: [],
      price,
      compareAtPrice: null,
      sku: "",
      weight: null,
      trackInventory: true,
      inventoryQuantity: sp.product.stock,
      allowBackorder: false,
      lowStockThreshold: 3,
      seoTitle: "",
      seoDescription: "",
      categoryIds: [],
      images: sp.product.images.map((url, i) => ({ url, isPrimary: i === 0 })),
      variants: [],
    });
    await db.update(products).set({ supplierProductId }).where(eq(products.id, created.id));
    await syncLinkedProducts([supplierProductId]); // copies the supplier's sizes/colours, with stock
    return created;
  } catch (error) {
    if (error instanceof ProductServiceError) throw new CatalogServiceError(error.message);
    throw error;
  }
}

/** The store's dropship products with their current supplier cost, for profit display. */
export async function listStoreDropshipProducts(storeId: string) {
  return db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      status: products.status,
      stock: products.inventoryQuantity,
      wholesalePrice: supplierProducts.wholesalePrice,
      supplierName: suppliers.businessName,
      available: sql<boolean>`${supplierProducts.isActive} and ${suppliers.status} = 'APPROVED'`,
    })
    .from(products)
    .innerJoin(supplierProducts, eq(supplierProducts.id, products.supplierProductId))
    .innerJoin(suppliers, eq(suppliers.id, supplierProducts.supplierId))
    .where(eq(products.storeId, storeId))
    .orderBy(desc(products.createdAt));
}

/** Product ids in this store that ship from a supplier (checkout needs to know). */
export async function listDropshipProductIds(storeId: string, productIds?: string[]) {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.storeId, storeId),
        sql`${products.supplierProductId} is not null`,
        productIds ? inArray(products.id, productIds) : undefined
      )
    );
  return rows.map((r) => r.id);
}

/** For the merchant's product edit page: who supplies this product and at what price. */
export async function getProductSupplierInfo(productId: string) {
  const [row] = await db
    .select({
      supplierName: suppliers.businessName,
      wholesalePrice: supplierProducts.wholesalePrice,
      deliveryDays: suppliers.deliveryDays,
    })
    .from(products)
    .innerJoin(supplierProducts, eq(supplierProducts.id, products.supplierProductId))
    .innerJoin(suppliers, eq(suppliers.id, supplierProducts.supplierId))
    .where(eq(products.id, productId))
    .limit(1);
  return row ? { ...row, wholesalePrice: Number(row.wholesalePrice) } : null;
}
