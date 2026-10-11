import "server-only";
import { after } from "next/server";
import { and, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  orders,
  orderItems,
  payments,
  payoutAccounts,
  supplierOrders,
  suppliers,
  stores,
} from "@/db/schema";
import { sendSupplierNewOrderEmail } from "@/lib/email";
import { notifyOrderPlaced, notifyOrderStatusChanged } from "@/modules/notifications/services/order-notifications";

export class FulfilmentError extends Error {}

/** Shopper's cut of dropship sales, % of the supplier items' selling price. Default 0. */
function platformFeePercent() {
  const v = Number(process.env.DROPSHIP_PLATFORM_FEE_PERCENT ?? 0);
  return Number.isFinite(v) && v >= 0 && v < 50 ? v : 0;
}

import { estimatePaystackFee } from "../fees";
export { estimatePaystackFee };

/**
 * Who gets what for a dropship order: each supplier their wholesale cost x
 * quantity, Shopper its fee (left in the main account), the store the rest
 * (and it bears Paystack's fee). Throws, with a customer-safe message, if a
 * payout account is missing or the store's share can't cover Paystack's fee.
 * Run before creating the order (so checkout fails early) and again when
 * starting the payment.
 */
export async function planDropshipSplit(input: {
  storeId: string;
  total: number;
  lines: { supplierId: string; unitCost: number; quantity: number; lineTotal: number }[];
}) {
  const bySupplier = new Map<string, number>();
  let dropshipSales = 0;
  for (const l of input.lines) {
    bySupplier.set(l.supplierId, (bySupplier.get(l.supplierId) ?? 0) + l.unitCost * l.quantity);
    dropshipSales += l.lineTotal;
  }
  if (bySupplier.size === 0) throw new FulfilmentError("Not a dropship order");

  const accounts = await db
    .select({ storeId: payoutAccounts.storeId, supplierId: payoutAccounts.supplierId, code: payoutAccounts.subaccountCode })
    .from(payoutAccounts)
    .where(
      sql`${payoutAccounts.storeId} = ${input.storeId} or ${payoutAccounts.supplierId} in (${sql.join(
        [...bySupplier.keys()].map((id) => sql`${id}`),
        sql`, `
      )})`
    );
  const storeAccount = accounts.find((a) => a.storeId === input.storeId);
  if (!storeAccount) {
    throw new FulfilmentError("Some items in your cart can't be bought online from this store right now. Please remove them or contact the store.");
  }

  const supplierTotal = [...bySupplier.values()].reduce((a, b) => a + b, 0);
  const platformFee = Math.round(dropshipSales * platformFeePercent()) / 100;
  const storeShare = Math.round((input.total - supplierTotal - platformFee) * 100) / 100;
  if (storeShare < estimatePaystackFee(input.total)) {
    throw new FulfilmentError("This discount can't be used with some items in your cart.");
  }

  const shares = [...bySupplier.entries()].map(([supplierId, amount]) => {
    const account = accounts.find((a) => a.supplierId === supplierId);
    if (!account) {
      throw new FulfilmentError("Some items in your cart can't be bought online right now. Please remove them or contact the store.");
    }
    return { subaccount: account.code, amount: Math.round(amount * 100) / 100 };
  });
  shares.push({ subaccount: storeAccount.code, amount: storeShare });
  return { bearerSubaccount: storeAccount.code, shares };
}

export async function computeDropshipSplit(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new FulfilmentError("Order not found");
  const lines = await db
    .select({
      supplierId: orderItems.supplierId,
      cost: orderItems.supplierUnitCost,
      quantity: orderItems.quantity,
      lineTotal: orderItems.lineTotal,
    })
    .from(orderItems)
    .where(and(eq(orderItems.orderId, orderId), isNotNull(orderItems.supplierId)));
  return planDropshipSplit({
    storeId: order.storeId,
    total: Number(order.total),
    lines: lines.map((l) => ({
      supplierId: l.supplierId!,
      unitCost: Number(l.cost),
      quantity: l.quantity,
      lineTotal: Number(l.lineTotal),
    })),
  });
}

/**
 * After a dropship order is paid: one supplier order per supplier, and an
 * email to each supplier. Safe to call twice (verify route + webhook race).
 */
export async function onDropshipOrderPaid(orderId: string, origin: string) {
  try {
    const lines = await db
      .select({ supplierId: orderItems.supplierId, cost: orderItems.supplierUnitCost, quantity: orderItems.quantity })
      .from(orderItems)
      .where(and(eq(orderItems.orderId, orderId), isNotNull(orderItems.supplierId)));
    if (lines.length === 0) return;
    const [order] = await db
      .select({ storeId: orders.storeId, orderNumber: orders.orderNumber, storeName: stores.name })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) return;

    const due = new Map<string, number>();
    for (const l of lines) due.set(l.supplierId!, (due.get(l.supplierId!) ?? 0) + Number(l.cost) * l.quantity);

    const created = await db
      .insert(supplierOrders)
      .values(
        [...due.entries()].map(([supplierId, amount]) => ({
          orderId,
          supplierId,
          storeId: order.storeId,
          amountDue: String(Math.round(amount * 100) / 100),
        }))
      )
      .onConflictDoNothing()
      .returning({ id: supplierOrders.id, supplierId: supplierOrders.supplierId, amountDue: supplierOrders.amountDue });

    if (created.length === 0) return;
    const contacts = await db
      .select({ id: suppliers.id, email: suppliers.email, businessName: suppliers.businessName })
      .from(suppliers)
      .where(inArray(suppliers.id, created.map((c) => c.supplierId)));
    for (const so of created) {
      const s = contacts.find((c) => c.id === so.supplierId);
      if (!s) continue;
      await sendSupplierNewOrderEmail(s.email, {
        supplierName: s.businessName,
        storeName: order.storeName,
        orderNumber: order.orderNumber,
        amountDue: Number(so.amountDue),
        orderUrl: `${origin}/supplier/orders/${so.id}`,
      }).catch((error: unknown) => console.error("supplier new-order email failed", error));
    }
  } catch (error) {
    console.error(`dropship fulfilment for order ${orderId} failed`, error);
  }
}

const NEXT_STATUS: Record<string, string[]> = {
  NEW: ["ACCEPTED", "SHIPPED"],
  ACCEPTED: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/**
 * Supplier moves their part of an order along. When every supplier on an
 * order that's entirely dropship has shipped (or delivered), the order
 * itself moves too, and the customer gets the usual status email.
 */
export async function updateSupplierOrderStatus(
  supplierId: string,
  supplierOrderId: string,
  status: "ACCEPTED" | "SHIPPED" | "DELIVERED",
  trackingNote: string | undefined,
  origin: string
) {
  const [so] = await db
    .select()
    .from(supplierOrders)
    .where(and(eq(supplierOrders.id, supplierOrderId), eq(supplierOrders.supplierId, supplierId)))
    .limit(1);
  if (!so) throw new FulfilmentError("Order not found");
  if (!NEXT_STATUS[so.status]?.includes(status)) {
    throw new FulfilmentError(`This order is already ${so.status.toLowerCase()}.`);
  }

  await db
    .update(supplierOrders)
    .set({
      status,
      trackingNote: trackingNote?.trim() ? trackingNote.trim().slice(0, 300) : so.trackingNote,
      shippedAt: status === "SHIPPED" ? new Date() : so.shippedAt,
      deliveredAt: status === "DELIVERED" ? new Date() : so.deliveredAt,
      updatedAt: new Date(),
    })
    .where(eq(supplierOrders.id, so.id));

  if (status === "ACCEPTED") return;
  const [mixed] = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .where(and(eq(orderItems.orderId, so.orderId), sql`${orderItems.supplierId} is null`))
    .limit(1);
  if (mixed) return; // the merchant ships their own items, so they move the order themselves

  const siblings = await db
    .select({ status: supplierOrders.status })
    .from(supplierOrders)
    .where(eq(supplierOrders.orderId, so.orderId));
  const all = (s: string[]) => siblings.every((x) => s.includes(x.status));
  const target = all(["DELIVERED"]) ? "DELIVERED" : all(["SHIPPED", "DELIVERED"]) ? "SHIPPED" : null;
  if (!target) return;

  const [moved] = await db
    .update(orders)
    .set({ fulfillmentStatus: target, updatedAt: new Date() })
    .where(and(eq(orders.id, so.orderId), sql`${orders.fulfillmentStatus} not in ('CANCELLED', ${target})`))
    .returning({ id: orders.id });
  if (moved) await notifyOrderStatusChanged(so.orderId, origin, { fulfillmentStatus: target });
}

/** Shared with the Paystack webhook: PAID once, then customer/merchant emails and supplier orders. */
export async function markDropshipOrderPaid(
  orderId: string,
  storeId: string,
  rawPayload: Record<string, unknown>,
  origin: string
) {
  const transitioned = await db
    .update(orders)
    .set({ paymentStatus: "PAID", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), ne(orders.paymentStatus, "PAID")))
    .returning({ id: orders.id });
  await db
    .update(payments)
    .set({ status: "SUCCEEDED", rawPayload, updatedAt: new Date() })
    .where(and(eq(payments.orderId, orderId), eq(payments.storeId, storeId)));
  if (transitioned.length > 0) {
    after(async () => {
      await notifyOrderPlaced(orderId, origin);
      await onDropshipOrderPaid(orderId, origin);
    });
  }
}

/** Merchant's order page: each supplier's delivery progress for this order. */
export async function listSupplierOrdersForOrder(storeId: string, orderId: string) {
  return db
    .select({
      id: supplierOrders.id,
      status: supplierOrders.status,
      trackingNote: supplierOrders.trackingNote,
      shippedAt: supplierOrders.shippedAt,
      deliveredAt: supplierOrders.deliveredAt,
      supplierName: suppliers.businessName,
      supplierPhone: suppliers.phone,
    })
    .from(supplierOrders)
    .innerJoin(suppliers, eq(suppliers.id, supplierOrders.supplierId))
    .where(and(eq(supplierOrders.storeId, storeId), eq(supplierOrders.orderId, orderId)));
}
