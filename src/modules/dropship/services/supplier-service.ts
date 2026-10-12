import "server-only";
import { and, desc, eq, sql, count, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  suppliers,
  supplierProducts,
  supplierProductVariants,
  supplierOrders,
  products,
  productVariants,
  orders,
  orderItems,
  customers,
  stores,
  users,
} from "@/db/schema";
import {
  supplierApplicationSchema,
  supplierProductSchema,
  type SupplierProductInput,
} from "../validation/schemas";

export class SupplierServiceError extends Error {}

function parse<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } }, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new SupplierServiceError(r.error.issues[0]?.message ?? "Check the details and try again");
  return r.data;
}

// --- Supplier account ------------------------------------------------------------

export async function getSupplierForUser(userId: string) {
  const [row] = await db.select().from(suppliers).where(eq(suppliers.userId, userId)).limit(1);
  return row ?? null;
}

/** For supplier-portal routes: the signed-in user's supplier account, optionally required to be approved. */
export async function requireSupplier(userId: string, opts: { approved?: boolean } = {}) {
  const supplier = await getSupplierForUser(userId);
  if (!supplier) throw new SupplierServiceError("You don't have a supplier account yet.");
  if (opts.approved && supplier.status !== "APPROVED") {
    throw new SupplierServiceError(
      supplier.status === "PENDING"
        ? "Your supplier account is waiting for approval."
        : "Your supplier account isn't active. Please contact Shopper support."
    );
  }
  return supplier;
}

export async function applyAsSupplier(userId: string, input: unknown) {
  const data = parse(supplierApplicationSchema, input);
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new SupplierServiceError("Account not found");

  const existing = await getSupplierForUser(userId);
  if (existing) {
    // Re-applying after a rejection, or updating details while pending.
    if (existing.status === "SUSPENDED") throw new SupplierServiceError("This supplier account is suspended.");
    const [row] = await db
      .update(suppliers)
      .set({
        ...data,
        address: data.address || null,
        status: existing.status === "APPROVED" ? "APPROVED" : "PENDING",
        statusNote: existing.status === "APPROVED" ? existing.statusNote : null,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(suppliers)
    .values({ ...data, address: data.address || null, userId, email: user.email })
    .returning();
  return row;
}

// --- Supplier products -----------------------------------------------------------

function productValues(data: SupplierProductInput) {
  // With sizes/colours, the product's stock is their total.
  const stock = data.variants.length > 0 ? data.variants.reduce((n, v) => n + v.inventoryQuantity, 0) : data.stock;
  return {
    name: data.name,
    description: data.description || null,
    images: data.images,
    category: data.category || null,
    wholesalePrice: String(data.wholesalePrice),
    suggestedPrice: data.suggestedPrice ? String(data.suggestedPrice) : null,
    stock,
    sku: data.sku || null,
    isActive: data.isActive,
  };
}

/** Upserts a supplier product's sizes/colours by id; removes the ones no longer listed. */
async function saveSupplierVariants(supplierProductId: string, variants: SupplierProductInput["variants"]) {
  const existing = await db
    .select({ id: supplierProductVariants.id })
    .from(supplierProductVariants)
    .where(eq(supplierProductVariants.supplierProductId, supplierProductId));
  const existingIds = new Set(existing.map((v) => v.id));
  const keep = new Set<string>();
  for (const v of variants) {
    const values = { name: v.name, options: v.options, stock: v.inventoryQuantity, updatedAt: new Date() };
    if (v.id && existingIds.has(v.id)) {
      keep.add(v.id);
      await db.update(supplierProductVariants).set(values).where(eq(supplierProductVariants.id, v.id));
    } else {
      await db.insert(supplierProductVariants).values({ supplierProductId, ...values });
    }
  }
  const removed = [...existingIds].filter((id) => !keep.has(id));
  if (removed.length > 0) await db.delete(supplierProductVariants).where(inArray(supplierProductVariants.id, removed));
}

export async function listSupplierProductVariants(supplierProductId: string) {
  return db
    .select()
    .from(supplierProductVariants)
    .where(eq(supplierProductVariants.supplierProductId, supplierProductId))
    .orderBy(supplierProductVariants.createdAt);
}

export async function listSupplierProducts(supplierId: string) {
  return db
    .select({
      product: supplierProducts,
      stores: sql<number>`(select count(*) from ${products} where ${products.supplierProductId} = ${supplierProducts.id})`.mapWith(Number),
    })
    .from(supplierProducts)
    .where(eq(supplierProducts.supplierId, supplierId))
    .orderBy(desc(supplierProducts.createdAt));
}

export async function getSupplierProduct(supplierId: string, id: string) {
  const [row] = await db
    .select()
    .from(supplierProducts)
    .where(and(eq(supplierProducts.id, id), eq(supplierProducts.supplierId, supplierId)))
    .limit(1);
  return row ?? null;
}

export async function createSupplierProduct(supplierId: string, input: unknown) {
  const data = parse(supplierProductSchema, input);
  const [row] = await db.insert(supplierProducts).values({ supplierId, ...productValues(data) }).returning();
  if (data.variants.length > 0) await saveSupplierVariants(row.id, data.variants);
  return row;
}

export async function updateSupplierProduct(supplierId: string, id: string, input: unknown) {
  const data = parse(supplierProductSchema, input);
  const existing = await getSupplierProduct(supplierId, id);
  if (!existing) throw new SupplierServiceError("Product not found");
  const [row] = await db
    .update(supplierProducts)
    .set({ ...productValues(data), updatedAt: new Date() })
    .where(eq(supplierProducts.id, id))
    .returning();
  await saveSupplierVariants(id, data.variants);
  await syncLinkedProducts([id]);
  return row;
}

/**
 * Keeps merchants' copies in step with the supplier: stock always mirrors the
 * supplier's, and a product the supplier switches off (or whose supplier is
 * no longer approved) drops to 0 stock so it can't be ordered. Price and
 * description stay the merchant's own.
 */
export async function syncLinkedProducts(
  supplierProductIds: string[],
  executor: Pick<typeof db, "execute"> = db
) {
  if (supplierProductIds.length === 0) return;
  const ids = sql.join(supplierProductIds.map((id) => sql`${id}`), sql`, `);
  await executor.execute(sql`
    update ${products} p
    set inventory_quantity = case when sp.is_active and s.status = 'APPROVED' then sp.stock else 0 end,
        track_inventory = true,
        allow_backorder = false,
        updated_at = now()
    from ${supplierProducts} sp join ${suppliers} s on s.id = sp.supplier_id
    where p.supplier_product_id = sp.id and sp.id in (${ids})
  `);

  // Sizes/colours: same rules per option. Merchants' copies follow the
  // supplier's list exactly -- options added, renamed, restocked or removed.
  const available = sql`case when sp.is_active and s.status = 'APPROVED' then sv.stock else 0 end`;
  await executor.execute(sql`
    update ${productVariants} pv
    set inventory_quantity = ${available}, name = sv.name, options = sv.options, updated_at = now()
    from ${supplierProductVariants} sv
      join ${supplierProducts} sp on sp.id = sv.supplier_product_id
      join ${suppliers} s on s.id = sp.supplier_id
    where pv.supplier_variant_id = sv.id and sp.id in (${ids})
  `);
  await executor.execute(sql`
    insert into ${productVariants} (id, product_id, name, options, inventory_quantity, supplier_variant_id)
    select gen_random_uuid()::text, p.id, sv.name, sv.options, ${available}, sv.id
    from ${products} p
      join ${supplierProductVariants} sv on sv.supplier_product_id = p.supplier_product_id
      join ${supplierProducts} sp on sp.id = sv.supplier_product_id
      join ${suppliers} s on s.id = sp.supplier_id
    where p.supplier_product_id in (${ids})
      and not exists (select 1 from ${productVariants} x where x.product_id = p.id and x.supplier_variant_id = sv.id)
  `);
  await executor.execute(sql`
    delete from ${productVariants} pv
    using ${products} p
    where pv.product_id = p.id and p.supplier_product_id in (${ids}) and pv.supplier_variant_id is null
  `);
}

export async function deleteSupplierProduct(supplierId: string, id: string) {
  const existing = await getSupplierProduct(supplierId, id);
  if (!existing) throw new SupplierServiceError("Product not found");
  // Merchants' copies would become orphans; switch it off instead so their
  // stores show it as out of stock and they can remove it themselves.
  const [{ n }] = await db.select({ n: count() }).from(products).where(eq(products.supplierProductId, id));
  if (n > 0) {
    await db.update(supplierProducts).set({ isActive: false, updatedAt: new Date() }).where(eq(supplierProducts.id, id));
    await syncLinkedProducts([id]);
    return { deleted: false, deactivated: true, stores: n };
  }
  await db.delete(supplierProducts).where(eq(supplierProducts.id, id));
  return { deleted: true, deactivated: false, stores: 0 };
}

// --- Supplier orders --------------------------------------------------------------

export async function listSupplierOrders(supplierId: string) {
  return db
    .select({
      id: supplierOrders.id,
      status: supplierOrders.status,
      amountDue: supplierOrders.amountDue,
      createdAt: supplierOrders.createdAt,
      orderNumber: orders.orderNumber,
      storeName: stores.name,
      customerName: customers.name,
      deliveryAddressText: orders.deliveryAddressText,
    })
    .from(supplierOrders)
    .innerJoin(orders, eq(orders.id, supplierOrders.orderId))
    .innerJoin(stores, eq(stores.id, supplierOrders.storeId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(supplierOrders.supplierId, supplierId))
    .orderBy(desc(supplierOrders.createdAt))
    .limit(200);
}

export async function getSupplierOrder(supplierId: string, supplierOrderId: string) {
  const [row] = await db
    .select({
      so: supplierOrders,
      orderNumber: orders.orderNumber,
      deliveryAddressText: orders.deliveryAddressText,
      customerNotes: orders.customerNotes,
      orderId: orders.id,
      storeName: stores.name,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(supplierOrders)
    .innerJoin(orders, eq(orders.id, supplierOrders.orderId))
    .innerJoin(stores, eq(stores.id, supplierOrders.storeId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(and(eq(supplierOrders.id, supplierOrderId), eq(supplierOrders.supplierId, supplierId)))
    .limit(1);
  if (!row) return null;
  const items = await db
    .select({
      productName: orderItems.productName,
      variantName: orderItems.variantName,
      quantity: orderItems.quantity,
      supplierUnitCost: orderItems.supplierUnitCost,
    })
    .from(orderItems)
    .where(and(eq(orderItems.orderId, row.orderId), eq(orderItems.supplierId, supplierId)));
  return { ...row, items };
}

// --- Admin -----------------------------------------------------------------------

export async function listSuppliersForAdmin() {
  return db
    .select({
      supplier: suppliers,
      productCount: sql<number>`(select count(*) from ${supplierProducts} where ${supplierProducts.supplierId} = ${suppliers.id})`.mapWith(Number),
      orderCount: sql<number>`(select count(*) from ${supplierOrders} where ${supplierOrders.supplierId} = ${suppliers.id})`.mapWith(Number),
    })
    .from(suppliers)
    .orderBy(sql`case ${suppliers.status} when 'PENDING' then 0 else 1 end`, desc(suppliers.createdAt));
}

export async function adminSetSupplierStatus(
  supplierId: string,
  status: "APPROVED" | "REJECTED" | "SUSPENDED",
  note?: string
) {
  const [row] = await db
    .update(suppliers)
    .set({
      status,
      statusNote: status === "APPROVED" ? null : note?.trim() || null,
      approvedAt: status === "APPROVED" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(suppliers.id, supplierId))
    .returning();
  if (!row) throw new SupplierServiceError("Supplier not found");
  // Suspending zeroes merchants' stock of this supplier's items; approving
  // (again) restores it.
  const ids = (await db.select({ id: supplierProducts.id }).from(supplierProducts).where(eq(supplierProducts.supplierId, supplierId))).map((r) => r.id);
  await syncLinkedProducts(ids);
  return row;
}

