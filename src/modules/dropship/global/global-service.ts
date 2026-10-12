import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { products, supplierProducts, supplierProductVariants, suppliers } from "@/db/schema";
import { getCjProduct, getCjVariantStock, quoteCjFreight, searchCjProducts, CjError } from "./cj-client";
import { nairaFromUsd, usdToNgnRate } from "./fx";
import { syncLinkedProducts } from "../services/supplier-service";

// Worldwide dropshipping: CJ Dropshipping products, fulfilled through
// Shopper's own CJ account. CJ is a built-in supplier (suppliers.kind = CJ)
// so imported products ride on the same machinery as local suppliers:
// "Add to my store", stock sync, split checkout, supplier orders. The naira
// "wholesale" price = (CJ unit price + cheapest shipping to Nigeria) in USD,
// converted with a buffer (fx.ts) -- that money stays in Shopper's Paystack
// account and pays for the CJ order.

export const DESTINATION = { code: "NG", name: "Nigeria" };
const MAX_VARIANTS = 40;

export class GlobalServiceError extends Error {}

/** The built-in worldwide supplier row, created on first use. */
export async function getCjSupplier() {
  const [existing] = await db.select().from(suppliers).where(eq(suppliers.kind, "CJ")).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(suppliers)
    .values({
      kind: "CJ",
      businessName: "Worldwide (CJ Dropshipping)",
      phone: "—",
      email: process.env.CONTACT_INBOX_EMAIL ?? "sundrecommunication@gmail.com",
      state: "International",
      description: "Global catalogue shipped from CJ Dropshipping's warehouses.",
      deliveryAreas: "Nigeria",
      deliveryDays: "10-25 days",
      status: "APPROVED",
      approvedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [row] = await db.select().from(suppliers).where(eq(suppliers.kind, "CJ")).limit(1);
  return row;
}

function friendly(error: unknown): never {
  if (error instanceof CjError) throw new GlobalServiceError(error.message);
  throw error;
}

/** Search results with an indicative naira price (product only; shipping is added when quoted). */
export async function searchWorldwide(keyword: string, page: number, storeId: string) {
  const term = keyword.trim();
  if (term.length < 2) return { items: [], total: 0 };
  let result;
  try {
    result = await searchCjProducts(term, page);
  } catch (error) {
    friendly(error);
  }
  const imported = result.items.length
    ? await db
        .select({
          externalId: supplierProducts.externalId,
          inStoreProductId: sql<string | null>`(select ${products.id} from ${products} where ${products.supplierProductId} = ${supplierProducts.id} and ${products.storeId} = ${storeId} limit 1)`,
        })
        .from(supplierProducts)
        .where(inArray(supplierProducts.externalId, result.items.map((i) => i.pid)))
    : [];
  const byPid = new Map(imported.map((r) => [r.externalId, r.inStoreProductId]));
  const items = await Promise.all(
    result.items.map(async (i) => ({ ...i, fromNaira: await nairaFromUsd(i.priceUsd), inStoreProductId: byPid.get(i.pid) ?? null }))
  );
  return { items, total: result.total };
}

/**
 * The full cost of one unit delivered to Nigeria: the dearest variant (so
 * one price covers every size/colour) plus CJ's cheapest shipping option.
 */
export async function quoteWorldwide(pid: string) {
  try {
    const product = await getCjProduct(pid);
    if (product.variants.length === 0) throw new GlobalServiceError("This product can't be shipped right now.");
    const dearest = product.variants.reduce((a, b) => (b.priceUsd > a.priceUsd ? b : a));
    const [cheapest] = await quoteCjFreight([{ vid: dearest.vid, quantity: 1 }], DESTINATION.code);
    if (!cheapest) throw new GlobalServiceError("CJ doesn't ship this product to Nigeria.");
    const costUsd = Math.round((dearest.priceUsd + cheapest.priceUsd) * 100) / 100;
    const wholesaleNaira = await nairaFromUsd(costUsd);
    const { rate, buffered } = await usdToNgnRate();
    return {
      product,
      costUsd,
      wholesaleNaira,
      suggestedNaira: Math.ceil((wholesaleNaira * 1.5) / 500) * 500,
      deliveryDays: cheapest.days ? `${cheapest.days} days` : "10-25 days",
      shippingUsd: cheapest.priceUsd,
      rate,
      buffered,
    };
  } catch (error) {
    friendly(error);
  }
}

async function stockFor(vids: string[]) {
  const stocks = await Promise.all(vids.map((vid) => getCjVariantStock(vid).catch(() => 0)));
  return new Map(vids.map((vid, i) => [vid, stocks[i]]));
}

/**
 * Creates or refreshes the supplier product for a CJ product (price, stock,
 * options), then re-syncs every store selling it. Returns its id.
 */
export async function importWorldwide(pid: string): Promise<string> {
  const q = await quoteWorldwide(pid);
  const supplier = await getCjSupplier();
  const variants = q.product.variants.slice(0, MAX_VARIANTS);
  const stock = await stockFor(variants.map((v) => v.vid));
  const single = variants.length === 1;
  const totalStock = variants.reduce((n, v) => n + (stock.get(v.vid) ?? 0), 0);
  const note = `\n\nShips internationally — usually arrives in ${q.deliveryDays}.`;

  const values = {
    supplierId: supplier.id,
    name: q.product.name.slice(0, 200),
    description: (q.product.description + note).trim().slice(0, 5000),
    images: q.product.images,
    category: q.product.category,
    wholesalePrice: String(q.wholesaleNaira),
    suggestedPrice: String(q.suggestedNaira),
    stock: totalStock,
    isActive: true,
    externalId: pid,
    externalVariantId: single ? variants[0].vid : null,
    deliveryDays: q.deliveryDays,
    costUsd: String(q.costUsd),
    syncedAt: new Date(),
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(supplierProducts)
    .values(values)
    .onConflictDoUpdate({ target: supplierProducts.externalId, set: values })
    .returning({ id: supplierProducts.id });

  // Options: upsert by CJ variant id, drop ones CJ no longer has.
  const existing = await db
    .select({ id: supplierProductVariants.id, externalId: supplierProductVariants.externalId })
    .from(supplierProductVariants)
    .where(eq(supplierProductVariants.supplierProductId, row.id));
  const keep = new Set<string>();
  if (!single) {
    for (const v of variants) {
      const match = existing.find((e) => e.externalId === v.vid);
      const data = { name: v.name.slice(0, 120), options: v.options, stock: stock.get(v.vid) ?? 0, externalId: v.vid, updatedAt: new Date() };
      if (match) {
        keep.add(match.id);
        await db.update(supplierProductVariants).set(data).where(eq(supplierProductVariants.id, match.id));
      } else {
        await db.insert(supplierProductVariants).values({ supplierProductId: row.id, ...data });
      }
    }
  }
  const gone = existing.filter((e) => !keep.has(e.id)).map((e) => e.id);
  if (gone.length) await db.delete(supplierProductVariants).where(inArray(supplierProductVariants.id, gone));

  await syncLinkedProducts([row.id]);
  return row.id;
}

/** CJ products that stores are selling, oldest refresh first (for the hourly job). */
export async function dueWorldwideRefreshes(limit: number) {
  const supplier = await getCjSupplier();
  return db
    .select({ id: supplierProducts.id, pid: supplierProducts.externalId })
    .from(supplierProducts)
    .where(
      and(
        eq(supplierProducts.supplierId, supplier.id),
        sql`${supplierProducts.syncedAt} < now() - interval '12 hours'`,
        sql`exists (select 1 from ${products} where ${products.supplierProductId} = ${supplierProducts.id})`
      )
    )
    .orderBy(supplierProducts.syncedAt)
    .limit(limit);
}
