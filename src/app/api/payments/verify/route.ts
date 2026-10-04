import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { stores, orders, payments, paymentProviders } from "@/db/schema";
import { verifyPaystackTransaction } from "@/modules/payments/adapters/paystack-adapter";
import { confirmPaydunyaTransaction } from "@/modules/payments/adapters/paydunya-adapter";

export async function POST(request: Request) {
  try {
    const { storeSlug, orderNumber } = await request.json();

    if (!storeSlug || !orderNumber) {
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

    // The reference/invoice-token to verify always comes from our own DB
    // record of the initialize call, never from the client -- a redirect's
    // query string (or lack of one, for PayDunya) isn't trusted either way.
    const [paymentRecord] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.orderId, order.id), eq(payments.storeId, store.id)))
      .limit(1);

    if (!paymentRecord?.transactionReference || !paymentRecord.providerId) {
      return NextResponse.json(
        { error: "No online payment attempt found for this order yet" },
        { status: 400 }
      );
    }

    const [provider] = await db
      .select()
      .from(paymentProviders)
      .where(eq(paymentProviders.id, paymentRecord.providerId))
      .limit(1);

    if (!provider || (provider.type !== "PAYSTACK" && provider.type !== "PAYDUNYA")) {
      return NextResponse.json(
        { error: "Could not determine the payment provider for this order" },
        { status: 400 }
      );
    }

    let verifiedSuccess = false;
    let rawPayload: Record<string, unknown> = {};
    let failureMessage = "Payment verification failed";

    if (provider.type === "PAYSTACK") {
      const secretKey = (provider.config?.secretKey as string) || process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey) {
        return NextResponse.json(
          { error: "Payment gateway is not configured for this store" },
          { status: 400 }
        );
      }

      const verification = await verifyPaystackTransaction(secretKey, paymentRecord.transactionReference);
      verifiedSuccess = Boolean(verification.status && verification.data?.status === "success");
      rawPayload = (verification.data as Record<string, unknown>) ?? {};
      failureMessage = verification.message || failureMessage;
    } else {
      const masterKey = (provider.config?.masterKey as string) || process.env.PAYDUNYA_MASTER_KEY;
      const privateKey = (provider.config?.privateKey as string) || process.env.PAYDUNYA_PRIVATE_KEY;
      const token = (provider.config?.token as string) || process.env.PAYDUNYA_TOKEN;
      const sandbox = Boolean(provider.config?.sandbox);

      if (!masterKey || !privateKey || !token) {
        return NextResponse.json(
          { error: "Payment gateway is not configured for this store" },
          { status: 400 }
        );
      }

      const confirmation = await confirmPaydunyaTransaction(
        masterKey,
        privateKey,
        token,
        paymentRecord.transactionReference,
        sandbox
      );
      verifiedSuccess = confirmation.responseCode === "00" && confirmation.status === "completed";
      rawPayload = confirmation.raw;
      failureMessage = confirmation.responseText || failureMessage;
    }

    if (verifiedSuccess) {
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
          rawPayload,
          updatedAt: new Date(),
        })
        .where(and(eq(payments.orderId, order.id), eq(payments.storeId, store.id)));

      return NextResponse.json({ success: true, message: "Payment verified successfully" });
    }

    return NextResponse.json({ error: failureMessage }, { status: 400 });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "An error occurred while verifying payment" },
      { status: 500 }
    );
  }
}
