import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  addresses,
  customers,
  orderItems,
  orders,
  productVariants,
  products,
  storeMembers,
  stores,
  supplierOrders,
  supplierProductVariants,
  supplierProducts,
  suppliers,
  users,
} from "@/db/schema";
import { sendDropshipAlertEmail, sendMerchantPriceRiseEmail } from "@/lib/email";
import { estimatePaystackFee } from "../fees";
import { createCjOrder, getCjOrder, payCjOrder, quoteCjFreight, CjError, cjConfigured } from "./cj-client";
import { DESTINATION, dueWorldwideRefreshes, importWorldwide } from "./global-service";

const PLACE_FAILED = "Couldn't place the order on CJ";
const PAY_FAILED = "CJ order created but not paid";

async function flagProblem(supplierOrderId: string, note: string, origin: string) {
  await db
    .update(supplierOrders)
    .set({ problemNote: note.slice(0, 500), problemAt: new Date(), updatedAt: new Date() })
    .where(eq(supplierOrders.id, supplierOrderId));
  const [ctx] = await db
    .select({ orderNumber: orders.orderNumber, storeName: stores.name })
    .from(supplierOrders)
    .innerJoin(orders, eq(orders.id, supplierOrders.orderId))
    .innerJoin(stores, eq(stores.id, supplierOrders.storeId))
    .where(eq(supplierOrders.id, supplierOrderId))
    .limit(1);
  if (!ctx) return;
  await sendDropshipAlertEmail({
    reason: note,
    orderNumber: ctx.orderNumber,
    storeName: ctx.storeName,
    supplierName: "Worldwide (CJ Dropshipping)",
    supplierPhone: "CJ dashboard",
    adminUrl: `${origin}/admin/dropship`,
  }).catch((e: unknown) => console.error("CJ alert email failed", e));
}

async function tryPay(supplierOrderId: string, cjOrderId: string, origin: string) {
  try {
    await payCjOrder(cjOrderId);
    await db
      .update(supplierOrders)
      .set({ externalStatus: "PAID", status: "ACCEPTED", problemNote: null, problemAt: null, updatedAt: new Date() })
      .where(eq(supplierOrders.id, supplierOrderId));
    return true;
  } catch (error) {
    await db.update(supplierOrders).set({ externalStatus: "UNPAID" }).where(eq(supplierOrders.id, supplierOrderId));
    await flagProblem(
      supplierOrderId,
      `${PAY_FAILED}: ${error instanceof Error ? error.message : "unknown error"}. Top up the CJ wallet — payment is retried every hour.`,
      origin
    );
    return false;
  }
}

/**
 * Places a paid worldwide order on CJ (customer's address, CJ's cheapest
 * shipping to Nigeria) and pays it from Shopper's CJ wallet. Problems are
 * flagged on the supplier order (admin monitor + email), never thrown --
 * the customer has already paid and the order is safe in Shopper.
 */
export async function placeCjOrder(supplierOrderId: string, origin: string) {
  try {
    const [so] = await db.select().from(supplierOrders).where(eq(supplierOrders.id, supplierOrderId)).limit(1);
    if (!so || so.externalOrderId) return;
    const [order] = await db
      .select({ orderNumber: orders.orderNumber, customerId: orders.customerId, address: orders.deliveryAddressText, storeSlug: stores.slug })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .where(eq(orders.id, so.orderId))
      .limit(1);
    const [customer] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);
    const [addr] = await db
      .select()
      .from(addresses)
      .where(eq(addresses.customerId, order.customerId))
      .orderBy(desc(addresses.createdAt))
      .limit(1);

    // CJ variant id for each line: the chosen option's, or the product's single one.
    const lines = await db
      .select({
        quantity: orderItems.quantity,
        optionVid: supplierProductVariants.externalId,
        singleVid: supplierProducts.externalVariantId,
      })
      .from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .innerJoin(supplierProducts, eq(supplierProducts.id, products.supplierProductId))
      .leftJoin(productVariants, eq(productVariants.id, orderItems.variantId))
      .leftJoin(supplierProductVariants, eq(supplierProductVariants.id, productVariants.supplierVariantId))
      .where(and(eq(orderItems.orderId, so.orderId), eq(orderItems.supplierId, so.supplierId)));
    const items = lines.map((l) => ({ vid: (l.optionVid ?? l.singleVid) as string, quantity: l.quantity }));
    if (items.length === 0 || items.some((i) => !i.vid)) throw new CjError("Couldn't match the products to CJ.");

    const [shipping] = await quoteCjFreight(items, DESTINATION.code);
    if (!shipping) throw new CjError("CJ has no shipping option to Nigeria for these items right now.");

    const { orderId } = await createCjOrder({
      orderNumber: `${order.storeSlug}-${order.orderNumber}`.slice(0, 50),
      countryCode: DESTINATION.code,
      country: DESTINATION.name,
      province: addr?.state || addr?.city || "Lagos",
      city: addr?.city || "",
      address: addr?.line1 || order.address || "",
      customerName: customer?.name ?? "Customer",
      phone: customer?.phone ?? "",
      email: customer?.email,
      logisticName: shipping.logisticName,
      items,
    });
    await db
      .update(supplierOrders)
      .set({ externalOrderId: orderId, externalStatus: "CREATED", trackingNote: `${shipping.logisticName} via CJ`, updatedAt: new Date() })
      .where(eq(supplierOrders.id, supplierOrderId));
    await tryPay(supplierOrderId, orderId, origin);
  } catch (error) {
    console.error(`CJ order for supplier order ${supplierOrderId} failed`, error);
    await flagProblem(supplierOrderId, `${PLACE_FAILED}: ${error instanceof Error ? error.message : "unknown error"}`, origin);
  }
}

/**
 * Hourly: follow up worldwide orders on CJ -- retry placing/paying, pick up
 * tracking numbers (-> Shipped, customer emailed) and deliveries.
 */
export async function syncCjOrders(origin: string) {
  if (!cjConfigured()) return { placed: 0, shipped: 0, delivered: 0 };
  const { updateSupplierOrderStatus } = await import("../services/fulfilment-service");
  const rows = await db
    .select({ so: supplierOrders })
    .from(supplierOrders)
    .innerJoin(suppliers, eq(suppliers.id, supplierOrders.supplierId))
    .where(and(eq(suppliers.kind, "CJ"), inArray(supplierOrders.status, ["NEW", "ACCEPTED", "SHIPPED"])))
    .limit(100);

  let placed = 0;
  let shipped = 0;
  let delivered = 0;
  for (const { so } of rows) {
    try {
      if (!so.externalOrderId) {
        // Never placed (or placing failed): try again, unless it's under 10 minutes old (still in flight).
        if (Date.now() - so.createdAt.getTime() < 10 * 60 * 1000) continue;
        await placeCjOrder(so.id, origin);
        placed++;
        continue;
      }
      if (so.externalStatus === "UNPAID") {
        await tryPay(so.id, so.externalOrderId, origin);
        continue;
      }
      const cjOrder = await getCjOrder(so.externalOrderId);
      const status = cjOrder.status.toUpperCase();
      await db.update(supplierOrders).set({ externalStatus: status }).where(eq(supplierOrders.id, so.id));
      const note = cjOrder.trackingNumber
        ? `${cjOrder.logisticName ?? "CJ"} — tracking ${cjOrder.trackingNumber}`
        : undefined;
      if ((cjOrder.trackingNumber || status === "SHIPPED") && so.status !== "SHIPPED") {
        await updateSupplierOrderStatus(so.supplierId, so.id, "SHIPPED", note, origin);
        shipped++;
      }
      if (status === "DELIVERED" || status === "FINISHED") {
        await updateSupplierOrderStatus(so.supplierId, so.id, "DELIVERED", undefined, origin).catch(() => undefined);
        delivered++;
      }
      if (status === "CANCELLED" && !so.problemAt) {
        await flagProblem(so.id, "CJ cancelled this order. Refund the customer, or place it again on CJ.", origin);
      }
    } catch (error) {
      console.error(`CJ sync for supplier order ${so.id} failed`, error);
    }
  }
  return { placed, shipped, delivered };
}

/**
 * Hourly (a few products per run): refresh worldwide products' cost and
 * stock from CJ. Any store whose price no longer covers the new cost gets
 * the product moved to draft and an email, so nobody sells at a loss.
 */
export async function refreshWorldwideProducts(origin: string, limit = 15) {
  if (!cjConfigured()) return { refreshed: 0, hidden: 0 };
  const due = await dueWorldwideRefreshes(limit);
  let refreshed = 0;
  let hidden = 0;
  for (const { id, pid } of due) {
    try {
      await importWorldwide(pid!);
      refreshed++;
    } catch (error) {
      // Gone from CJ / can't ship any more: take it out of every store.
      console.error(`CJ refresh of ${pid} failed`, error);
      await db.update(supplierProducts).set({ isActive: false, syncedAt: new Date() }).where(eq(supplierProducts.id, id));
      const { syncLinkedProducts } = await import("../services/supplier-service");
      await syncLinkedProducts([id]);
      continue;
    }
    const [sp] = await db.select({ cost: supplierProducts.wholesalePrice }).from(supplierProducts).where(eq(supplierProducts.id, id)).limit(1);
    const cost = Number(sp.cost);
    const losing = await db
      .select({ id: products.id, name: products.name, price: products.price, storeId: products.storeId, storeName: stores.name })
      .from(products)
      .innerJoin(stores, eq(stores.id, products.storeId))
      .where(and(eq(products.supplierProductId, id), eq(products.status, "ACTIVE")));
    for (const p of losing) {
      const price = Number(p.price);
      if (price - cost > estimatePaystackFee(price)) continue;
      await db.update(products).set({ status: "DRAFT", updatedAt: new Date() }).where(eq(products.id, p.id));
      hidden++;
      const owners = await db
        .select({ email: users.email })
        .from(storeMembers)
        .innerJoin(users, eq(users.id, storeMembers.userId))
        .where(and(eq(storeMembers.storeId, p.storeId), eq(storeMembers.role, "OWNER")));
      if (owners.length) {
        await sendMerchantPriceRiseEmail(owners.map((o) => o.email), {
          storeName: p.storeName,
          productName: p.name,
          newCost: cost,
          minPrice: Math.ceil(cost + estimatePaystackFee(cost) + 1),
          productUrl: `${origin}/dashboard/products/${p.id}`,
        }).catch((e: unknown) => console.error("price rise email failed", e));
      }
    }
  }
  return { refreshed, hidden };
}

