import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { stores, orders, payments, paymentProviders } from "@/db/schema";
import { verifyPaystackTransaction } from "@/modules/payments/adapters/paystack-adapter";

export async function POST(request: Request) {
  try {
    const { storeSlug, orderNumber, reference } = await request.json();

    if (!storeSlug || !orderNumber || !reference) {
      return NextResponse.json(
        { error: "Missing required verification parameters" },
        { status: 400 }
      );
    }

    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.slug, storeSlug))
      .limit(1);

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

    // If order is already paid
    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ success: true, message: "Order is already paid" });
    }

    // Get store's Paystack provider
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
        { error: "Payment gateway is not configured for this store" },
        { status: 400 }
      );
    }

    const verification = await verifyPaystackTransaction(secretKey, reference);

    if (verification.status && verification.data?.status === "success") {
      // Mark order as paid
      await db
        .update(orders)
        .set({
          paymentStatus: "PAID",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      await db
        .update(payments)
        .set({
          status: "SUCCEEDED",
          transactionReference: reference,
          rawPayload: verification.data as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(and(eq(payments.orderId, order.id), eq(payments.storeId, store.id)));

      return NextResponse.json({ success: true, message: "Payment verified successfully" });
    }

    return NextResponse.json(
      { error: verification.message || "Payment verification failed" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "An error occurred while verifying payment" },
      { status: 500 }
    );
  }
}
