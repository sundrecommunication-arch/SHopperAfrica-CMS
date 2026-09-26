import "server-only";
import { eq, and, lt, inArray, desc } from "drizzle-orm";

import { db } from "@/db";
import { orders, orderItems, customers, abandonedCartNudges } from "@/db/schema";

export class AbandonedCartServiceError extends Error {}

// Only these payment methods represent a checkout the customer genuinely
// left unfinished — Cash on Delivery and WhatsApp Order are fully placed
// orders awaiting fulfillment, not abandoned attempts (docs: abandoned-cart
// feature notes).
const ABANDONABLE_PAYMENT_METHODS = ["Paystack Online Payment", "Bank Transfer"];

export interface AbandonedCheckoutItem {
  name: string;
  variantName: string | null;
  quantity: number;
}

export interface AbandonedCheckout {
  id: string;
  orderNumber: string;
  createdAt: Date;
  total: string;
  paymentMethod: string | null;
  customerName: string;
  customerPhone: string;
  items: AbandonedCheckoutItem[];
  lastNudgeAt: Date | null;
  nudgeCount: number;
}

/**
 * Website checkouts that were placed (customer + order + items already
 * created, inventory already decremented) but never moved past PENDING
 * payment — the customer started checkout and never completed payment.
 * WhatsApp-channel orders and payment methods that don't require the
 * customer to complete anything further (Cash on Delivery, WhatsApp Order)
 * are excluded — those are normal open orders, not abandoned checkouts.
 */
export async function listAbandonedCheckouts(
  storeId: string,
  thresholdHours: number
): Promise<AbandonedCheckout[]> {
  const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

  const staleOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      createdAt: orders.createdAt,
      total: orders.total,
      paymentMethod: orders.paymentMethod,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(
      and(
        eq(orders.storeId, storeId),
        eq(orders.checkoutChannel, "WEBSITE"),
        eq(orders.paymentStatus, "PENDING"),
        eq(orders.fulfillmentStatus, "NEW"),
        inArray(orders.paymentMethod, ABANDONABLE_PAYMENT_METHODS),
        lt(orders.createdAt, cutoff)
      )
    )
    .orderBy(orders.createdAt);

  if (staleOrders.length === 0) return [];

  const orderIds = staleOrders.map((o) => o.id);

  const [items, nudges] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
    db
      .select()
      .from(abandonedCartNudges)
      .where(inArray(abandonedCartNudges.orderId, orderIds))
      .orderBy(desc(abandonedCartNudges.createdAt)),
  ]);

  const itemsByOrder = new Map<string, AbandonedCheckoutItem[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push({ name: item.productName, variantName: item.variantName, quantity: item.quantity });
    itemsByOrder.set(item.orderId, list);
  }

  const nudgesByOrder = new Map<string, { lastAt: Date; count: number }>();
  for (const nudge of nudges) {
    const existing = nudgesByOrder.get(nudge.orderId);
    if (existing) {
      existing.count += 1;
    } else {
      nudgesByOrder.set(nudge.orderId, { lastAt: nudge.createdAt, count: 1 });
    }
  }

  return staleOrders.map((order) => {
    const nudgeInfo = nudgesByOrder.get(order.id);
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      total: order.total,
      paymentMethod: order.paymentMethod,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: itemsByOrder.get(order.id) ?? [],
      lastNudgeAt: nudgeInfo?.lastAt ?? null,
      nudgeCount: nudgeInfo?.count ?? 0,
    };
  });
}

/** Records that a merchant sent a WhatsApp nudge for an abandoned checkout. */
export async function recordAbandonedCartNudge(
  storeId: string,
  orderId: string,
  userId: string | null
) {
  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
    .limit(1);

  if (!order) {
    throw new AbandonedCartServiceError("Order not found");
  }

  const [nudge] = await db
    .insert(abandonedCartNudges)
    .values({
      orderId,
      storeId,
      sentByUserId: userId,
      channel: "whatsapp",
    })
    .returning();

  return nudge;
}
