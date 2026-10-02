import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { stores, orders, payments, paymentProviders, customers } from "@/db/schema";
import { initializePaystackTransaction } from "@/modules/payments/adapters/paystack-adapter";
import { getPublicOrigin } from "@/lib/request-origin";

/**
 * Starts a Paystack transaction for an already-created (PENDING) order and
 * returns the hosted checkout URL to redirect the customer to. Called from
 * the checkout form right after order creation when Paystack is selected,
 * and again from the order receipt page's "Complete Payment" retry button
 * for an order that's still PENDING (e.g. the customer closed the Paystack
 * tab the first time).
 */
export async function POST(request: Request) {
  try {
    const { storeSlug, orderNumber } = await request.json().catch(() => ({}));

    if (!storeSlug || !orderNumber) {
      return NextResponse.json({ error: "Missing store or order reference" }, { status: 400 });
    }

    const [store] = await db.select().from(stores).where(eq(stores.slug, storeSlug)).limit(1);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.storeId, store.id), eq(orders.orderNumber, orderNumber)))
      .limit(1);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ error: "This order has already been paid for" }, { status: 400 });
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, order.customerId))
      .limit(1);

    if (!customer?.email) {
      return NextResponse.json(
        { error: "An email address is required for online card payments" },
        { status: 400 }
      );
    }

    const [provider] = await db
      .select()
      .from(paymentProviders)
      .where(
        and(
          eq(paymentProviders.storeId, store.id),
          eq(paymentProviders.type, "PAYSTACK"),
          eq(paymentProviders.isEnabled, true)
        )
      )
      .limit(1);

    const secretKey = (provider?.config?.secretKey as string) || process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: "Online card payment is not configured for this store yet" },
        { status: 400 }
      );
    }

    // A fresh reference per attempt — lets a customer retry after an
    // abandoned or failed attempt without colliding with the last one.
    const reference = `${order.orderNumber}-${Date.now()}`;
    // Not `new URL(request.url).origin` — behind Railway's proxy that always
    // reads as localhost:<internal port>. See getPublicOrigin for why.
    const origin = getPublicOrigin(request);
    // Paystack appends its own ?reference=&trxref= to whatever we pass here
    // once the customer completes (or cancels) the payment.
    const callbackUrl = `${origin}/store/${storeSlug}/orders/${orderNumber}`;

    const { authorizationUrl } = await initializePaystackTransaction({
      secretKey,
      email: customer.email,
      amount: parseFloat(order.total),
      reference,
      callbackUrl,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    });

    await db
      .update(payments)
      .set({
        transactionReference: reference,
        providerId: provider?.id ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(payments.orderId, order.id), eq(payments.storeId, store.id)));

    return NextResponse.json({ authorizationUrl });
  } catch (error) {
    console.error("Paystack initialize error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start payment" },
      { status: 500 }
    );
  }
}
