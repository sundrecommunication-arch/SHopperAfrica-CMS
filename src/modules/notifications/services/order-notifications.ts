import "server-only";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import {
  stores,
  storeSettings,
  storeMembers,
  users,
  orders,
  orderItems,
  customers,
} from "@/db/schema";
import {
  sendNewOrderEmail,
  sendOrderConfirmationEmail,
  sendOrderUpdateEmail,
  type OrderEmailDetails,
} from "@/lib/email";

// Order emails (docs section 31). Every function here is best-effort: it's
// meant to run inside next/server's after() so a slow or failing email
// provider never delays or breaks checkout. Failures are logged, not thrown.

function emailConfigured(): boolean {
  if (!process.env.RESEND_API_KEY) {
    console.warn("Order notifications skipped: RESEND_API_KEY is not set");
    return false;
  }
  return true;
}

async function loadOrderContext(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;

  const [[store], [settings], [customer], items] = await Promise.all([
    db.select().from(stores).where(eq(stores.id, order.storeId)).limit(1),
    db.select().from(storeSettings).where(eq(storeSettings.storeId, order.storeId)).limit(1),
    db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1),
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
  ]);
  if (!store || !customer) return null;

  // No settings row yet = defaults, which are all "on".
  const prefs = {
    email: settings?.emailNotificationsEnabled ?? true,
    merchant: settings?.orderNotificationsEnabled ?? true,
    customer: settings?.customerNotificationsEnabled ?? true,
  };

  return { order, store, customer, items, prefs };
}

function receiptUrl(origin: string, storeSlug: string, orderNumber: string) {
  return `${origin}/store/${storeSlug}/orders/${encodeURIComponent(orderNumber)}`;
}

/**
 * New-order emails: one to the store owner(s), one to the customer if they
 * gave an email. Call once per order — at placement for offline payment
 * methods, or when an online payment is first confirmed.
 */
export async function notifyOrderPlaced(orderId: string, origin: string): Promise<void> {
  try {
    if (!emailConfigured()) return;
    const ctx = await loadOrderContext(orderId);
    if (!ctx || !ctx.prefs.email) return;
    const { order, store, customer, items, prefs } = ctx;

    const details: Omit<OrderEmailDetails, "orderUrl"> = {
      storeName: store.name,
      orderNumber: order.orderNumber,
      currencySymbol: store.currencySymbol,
      items: items.map((i) => ({
        name: i.productName,
        variantName: i.variantName,
        quantity: i.quantity,
        lineTotal: parseFloat(i.lineTotal),
      })),
      subtotal: parseFloat(order.subtotal),
      discount: parseFloat(order.discountAmount),
      deliveryMethod: order.deliveryMethod,
      deliveryFee: parseFloat(order.shippingAmount),
      total: parseFloat(order.total),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      deliveryAddress: order.deliveryAddressText,
      customerNotes: order.customerNotes,
    };

    const jobs: Promise<void>[] = [];

    if (prefs.merchant) {
      const owners = await db
        .select({ email: users.email })
        .from(storeMembers)
        .innerJoin(users, eq(users.id, storeMembers.userId))
        .where(and(eq(storeMembers.storeId, store.id), eq(storeMembers.role, "OWNER")));
      const to = owners.map((o) => o.email).filter((e): e is string => Boolean(e));
      if (to.length > 0) {
        jobs.push(
          sendNewOrderEmail(to, { ...details, orderUrl: `${origin}/dashboard/orders/${order.id}` })
        );
      }
    }

    if (prefs.customer && customer.email) {
      jobs.push(
        sendOrderConfirmationEmail(customer.email, {
          ...details,
          orderUrl: receiptUrl(origin, store.slug, order.orderNumber),
        })
      );
    }

    const results = await Promise.allSettled(jobs);
    for (const r of results) {
      if (r.status === "rejected") console.error("Order notification failed:", r.reason);
    }
  } catch (error) {
    console.error("Order notification failed:", error);
  }
}

// Only the changes a customer actually cares about get an email.
const FULFILLMENT_MESSAGES: Record<string, { headline: string; message: string }> = {
  CONFIRMED: {
    headline: "Order confirmed",
    message: "your order has been confirmed and will be prepared soon.",
  },
  SHIPPED: {
    headline: "Your order is on its way",
    message: "your order has been shipped and is on its way to you.",
  },
  READY: {
    headline: "Your order is ready",
    message: "your order is ready for pickup or delivery.",
  },
  DELIVERED: {
    headline: "Order delivered",
    message: "your order has been delivered. Thank you for shopping with us!",
  },
  CANCELLED: {
    headline: "Order cancelled",
    message: "your order has been cancelled. Please contact the store if you have any questions.",
  },
};

/**
 * Customer email for a merchant-made status change. Pass only the fields
 * that actually changed.
 */
export async function notifyOrderStatusChanged(
  orderId: string,
  origin: string,
  changes: { fulfillmentStatus?: string; paymentStatus?: string }
): Promise<void> {
  try {
    const update =
      changes.paymentStatus === "PAID"
        ? { headline: "Payment received", message: "we've received your payment. Thank you!" }
        : changes.fulfillmentStatus
        ? FULFILLMENT_MESSAGES[changes.fulfillmentStatus]
        : undefined;
    if (!update) return;

    if (!emailConfigured()) return;
    const ctx = await loadOrderContext(orderId);
    if (!ctx || !ctx.prefs.email || !ctx.prefs.customer || !ctx.customer.email) return;
    const { order, store, customer } = ctx;

    await sendOrderUpdateEmail(customer.email!, {
      storeName: store.name,
      orderNumber: order.orderNumber,
      customerName: customer.name,
      headline: update.headline,
      message: update.message,
      orderUrl: receiptUrl(origin, store.slug, order.orderNumber),
    });
  } catch (error) {
    console.error("Order status notification failed:", error);
  }
}
