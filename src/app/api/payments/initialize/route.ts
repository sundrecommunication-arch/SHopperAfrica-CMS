import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { stores, orders, payments, paymentProviders, customers } from "@/db/schema";
import { initializePaystackTransaction } from "@/modules/payments/adapters/paystack-adapter";
import { initializePaydunyaTransaction } from "@/modules/payments/adapters/paydunya-adapter";
import { getPublicOrigin } from "@/lib/request-origin";
import { getStorePlan } from "@/modules/subscriptions/services/subscription-service";

/**
 * Starts an online-payment transaction (Paystack or PayDunya) for an
 * already-created (PENDING) order and returns the hosted checkout URL to
 * redirect the customer to. Called from the checkout form right after order
 * creation with `paymentMethodType` set to whichever the customer picked,
 * and again from the order receipt page's retry button for a still-PENDING
 * order -- that second call omits `paymentMethodType`, so it falls back to
 * whichever provider the first attempt already recorded on the order's
 * payment row.
 */
export async function POST(request: Request) {
  try {
    const { storeSlug, orderNumber, paymentMethodType } = await request.json().catch(() => ({}));

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

    const [paymentRow] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.orderId, order.id), eq(payments.storeId, store.id)))
      .limit(1);

    // A retry (no paymentMethodType in the body) reuses whichever provider
    // the first attempt already picked, via the provider it recorded on the
    // order's payment row.
    let providerType = paymentMethodType as string | undefined;
    if (!providerType && paymentRow?.providerId) {
      const [existingProvider] = await db
        .select({ type: paymentProviders.type })
        .from(paymentProviders)
        .where(eq(paymentProviders.id, paymentRow.providerId))
        .limit(1);
      providerType = existingProvider?.type;
    }
    providerType = providerType || "PAYSTACK";

    if (providerType !== "PAYSTACK" && providerType !== "PAYDUNYA") {
      return NextResponse.json({ error: "Unsupported online payment method" }, { status: 400 });
    }

    if (!(await getStorePlan(store.id)).limits.onlinePayments) {
      return NextResponse.json(
        { error: "Online payment isn't available for this store right now. Please choose another payment method." },
        { status: 400 }
      );
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, order.customerId))
      .limit(1);

    if (!customer?.email) {
      return NextResponse.json(
        { error: "An email address is required for online payments" },
        { status: 400 }
      );
    }

    const [provider] = await db
      .select()
      .from(paymentProviders)
      .where(
        and(
          eq(paymentProviders.storeId, store.id),
          eq(paymentProviders.type, providerType),
          eq(paymentProviders.isEnabled, true)
        )
      )
      .limit(1);

    // Not `new URL(request.url).origin` — behind Railway's proxy that always
    // reads as localhost:<internal port>. See getPublicOrigin for why.
    const origin = getPublicOrigin(request);
    const returnUrl = `${origin}/store/${storeSlug}/orders/${orderNumber}`;

    let authorizationUrl: string;
    let transactionReference: string;

    if (providerType === "PAYSTACK") {
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
      // Paystack appends its own ?reference=&trxref= to whatever we pass
      // here once the customer completes (or cancels) the payment -- we
      // don't rely on those, but Paystack requires a callback_url regardless.
      const result = await initializePaystackTransaction({
        secretKey,
        email: customer.email,
        amount: parseFloat(order.total),
        reference,
        callbackUrl: returnUrl,
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
      });
      authorizationUrl = result.authorizationUrl;
      transactionReference = result.reference;
    } else {
      const masterKey = (provider?.config?.masterKey as string) || process.env.PAYDUNYA_MASTER_KEY;
      const privateKey = (provider?.config?.privateKey as string) || process.env.PAYDUNYA_PRIVATE_KEY;
      const paydunyaToken = (provider?.config?.token as string) || process.env.PAYDUNYA_TOKEN;
      const sandbox = Boolean(provider?.config?.sandbox);

      if (!masterKey || !privateKey || !paydunyaToken) {
        return NextResponse.json(
          { error: "PayDunya is not configured for this store yet" },
          { status: 400 }
        );
      }

      const result = await initializePaydunyaTransaction({
        masterKey,
        privateKey,
        token: paydunyaToken,
        sandbox,
        amount: parseFloat(order.total),
        description: `Order ${order.orderNumber} - ${store.name}`,
        storeName: store.name,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        returnUrl,
        cancelUrl: returnUrl,
        callbackUrl: `${origin}/api/payments/webhooks/paydunya`,
        customData: { orderId: order.id, orderNumber: order.orderNumber },
      });
      authorizationUrl = result.checkoutUrl;
      transactionReference = result.invoiceToken;
    }

    await db
      .update(payments)
      .set({
        transactionReference,
        providerId: provider?.id ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(payments.orderId, order.id), eq(payments.storeId, store.id)));

    return NextResponse.json({ authorizationUrl });
  } catch (error) {
    console.error("Payment initialize error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start payment" },
      { status: 500 }
    );
  }
}
