import "server-only";
import { after } from "next/server";
import { and, eq, gt, like, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { orders, paymentProviders, payments, stores } from "@/db/schema";
import { notifyOrderPlaced } from "@/modules/notifications/services/order-notifications";
import { assertFeature, SubscriptionServiceError } from "@/modules/subscriptions/services/subscription-service";
import { getCountry, STRIPE_CURRENCIES } from "@/modules/regions/countries";
import {
  checkMerchantKey,
  createConnectedAccount,
  createOnboardingLink,
  getAccountStatus,
  getOrderCheckout,
  isLiveKey,
  isStripeSecretKey,
  stripeConfigured,
  type StripeAccountStatus,
  type StripeCredentials,
} from "../adapters/stripe-adapter";

// A store's Stripe setup lives in its STRIPE payment_providers row, in one
// of two shapes:
//
// Own keys (default): config = { mode: "keys", secretKey, webhookSecret?,
// livemode, keyHint } -- the merchant's key, like Paystack secret keys.
//
// Connect (only when Shopper has a platform Stripe account):
// config = { accountId, chargesEnabled, payoutsEnabled, detailsSubmitted,
// disconnected }.
// No secrets -- the platform key is in env, and the merchant's own keys stay
// with Stripe. isEnabled = chargesEnabled and not switched off by the
// merchant: checkout only offers card payment once Stripe says the account
// can take charges.

export class StripeConnectError extends Error {}

/** How to reach a store's Stripe account from its provider config, or null if it isn't set up. */
export function stripeCredentials(config: Record<string, unknown> | null | undefined): StripeCredentials | null {
  if (typeof config?.secretKey === "string" && config.secretKey) return { secretKey: config.secretKey };
  if (typeof config?.accountId === "string" && config.accountId && stripeConfigured()) return { accountId: config.accountId };
  return null;
}

/** What the dashboard shows about a store's Stripe setup -- never the key itself. */
export async function getStripeSetup(storeId: string) {
  const [row] = await db
    .select({ isEnabled: paymentProviders.isEnabled, config: paymentProviders.config })
    .from(paymentProviders)
    .where(and(eq(paymentProviders.storeId, storeId), eq(paymentProviders.type, "STRIPE")))
    .limit(1);
  const config = row?.config ?? {};
  if (config.mode !== "keys") return null;
  return {
    enabled: row!.isEnabled,
    keyHint: String(config.keyHint ?? ""),
    livemode: Boolean(config.livemode),
    hasWebhook: Boolean(config.webhookSecret),
  };
}

/**
 * Saves a merchant's own Stripe key (and optional webhook signing secret)
 * after checking it works. A restricted key with Checkout Sessions "Write"
 * is all that's needed and is what we recommend.
 */
export async function saveStripeKeys(storeId: string, input: { secretKey: string; webhookSecret?: string | null }) {
  const secretKey = input.secretKey.trim();
  const webhookSecret = input.webhookSecret?.trim() || null;
  if (secretKey.startsWith("pk_")) {
    throw new StripeConnectError("That's your publishable key. Paste the secret key (sk_...) or a restricted key (rk_...).");
  }
  if (!isStripeSecretKey(secretKey)) {
    throw new StripeConnectError("That doesn't look like a Stripe secret key. It starts with sk_live_, rk_live_ (or sk_test_/rk_test_ for testing).");
  }
  if (webhookSecret && !/^whsec_[A-Za-z0-9]{10,}$/.test(webhookSecret)) {
    throw new StripeConnectError("The webhook signing secret starts with whsec_.");
  }
  const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!store) throw new StripeConnectError("Store not found");
  const blocked = stripeEligibility(store);
  if (blocked) throw new StripeConnectError(blocked);
  try {
    await assertFeature(storeId, "onlinePayments");
  } catch (error) {
    if (error instanceof SubscriptionServiceError) throw new StripeConnectError(error.message);
    throw error;
  }
  try {
    await checkMerchantKey(secretKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe didn't accept that key.";
    throw new StripeConnectError(`Stripe didn't accept that key: ${message}`);
  }

  const values = {
    label: "Card payment (Stripe)",
    isEnabled: true,
    config: { mode: "keys", secretKey, webhookSecret, livemode: isLiveKey(secretKey), keyHint: secretKey.slice(-4) },
    updatedAt: new Date(),
  };
  const [existing] = await db
    .select({ id: paymentProviders.id })
    .from(paymentProviders)
    .where(and(eq(paymentProviders.storeId, storeId), eq(paymentProviders.type, "STRIPE")))
    .limit(1);
  if (existing) await db.update(paymentProviders).set(values).where(eq(paymentProviders.id, existing.id));
  else await db.insert(paymentProviders).values({ storeId, type: "STRIPE", ...values });
}

/** Forgets the merchant's Stripe key; card payment disappears from checkout. */
export async function removeStripeKeys(storeId: string) {
  await db
    .delete(paymentProviders)
    .where(and(eq(paymentProviders.storeId, storeId), eq(paymentProviders.type, "STRIPE")));
}

/** Marks an order paid by a confirmed Stripe Checkout payment; emails go out once. */
export async function markStripeOrderPaid(
  orderId: string,
  paymentId: string,
  session: { id: string; payment_intent?: unknown; amount_total?: number | null; currency?: string | null },
  origin: string
) {
  await db.transaction(async (tx) => {
    // Conditional on not-yet-PAID: the return page, webhook and hourly check
    // can all confirm the same payment, and only one may send the emails.
    const transitioned = await tx
      .update(orders)
      .set({ paymentStatus: "PAID", updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), ne(orders.paymentStatus, "PAID")))
      .returning({ id: orders.id });
    if (transitioned.length > 0) after(() => notifyOrderPlaced(orderId, origin));
    await tx
      .update(payments)
      .set({
        status: "SUCCEEDED",
        rawPayload: { id: session.id, payment_intent: session.payment_intent ?? null, amount_total: session.amount_total ?? null, currency: session.currency ?? null },
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));
  });
}

/**
 * Hourly safety net for stores without a webhook: a customer who paid but
 * closed the tab before coming back to the shop still gets their order
 * marked paid. Looks at Stripe checkouts started in the last 3 days.
 */
export async function reconcileStripePayments(origin: string) {
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const pending = await db
    .select({ paymentId: payments.id, orderId: payments.orderId, sessionId: payments.transactionReference, config: paymentProviders.config })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(paymentProviders, eq(paymentProviders.id, payments.providerId))
    .where(
      and(
        eq(paymentProviders.type, "STRIPE"),
        eq(orders.paymentStatus, "PENDING"),
        like(payments.transactionReference, "cs\\_%"),
        gt(payments.updatedAt, since)
      )
    )
    .limit(200);
  let paid = 0;
  for (const row of pending) {
    const credentials = stripeCredentials(row.config);
    if (!credentials || !row.sessionId) continue;
    try {
      const session = await getOrderCheckout(credentials, row.sessionId);
      if (session.payment_status === "paid" && session.metadata?.orderId === row.orderId) {
        await markStripeOrderPaid(row.orderId, row.paymentId, session, origin);
        paid++;
      }
    } catch (error) {
      console.error("stripe reconcile failed", row.orderId, error);
    }
  }
  return { checked: pending.length, paid };
}

export interface StripeConnection extends StripeAccountStatus {
  providerId: string;
  disconnected: boolean;
}

export async function getStripeConnection(storeId: string): Promise<StripeConnection | null> {
  const [row] = await db
    .select({ id: paymentProviders.id, config: paymentProviders.config })
    .from(paymentProviders)
    .where(and(eq(paymentProviders.storeId, storeId), eq(paymentProviders.type, "STRIPE")))
    .limit(1);
  const config = (row?.config ?? {}) as Partial<StripeAccountStatus> & { disconnected?: boolean };
  if (!row || !config.accountId) return null;
  return {
    providerId: row.id,
    accountId: config.accountId,
    chargesEnabled: Boolean(config.chargesEnabled),
    payoutsEnabled: Boolean(config.payoutsEnabled),
    detailsSubmitted: Boolean(config.detailsSubmitted),
    disconnected: Boolean(config.disconnected),
  };
}

async function saveStatus(storeId: string, status: StripeAccountStatus, disconnected?: boolean) {
  const existing = await getStripeConnection(storeId);
  const off = disconnected ?? existing?.disconnected ?? false;
  const values = {
    label: "Card payment (Stripe)",
    isEnabled: status.chargesEnabled && !off,
    config: {
      accountId: status.accountId,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
      disconnected: off,
    },
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(paymentProviders).set(values).where(eq(paymentProviders.id, existing.providerId));
  } else {
    await db.insert(paymentProviders).values({ storeId, type: "STRIPE", ...values });
  }
}

/** Whether this store can use Stripe at all, and why not if it can't. */
export function stripeEligibility(store: { currency: string; country: string }): string | null {
  if (getCountry(store.country).cardProvider !== "STRIPE") {
    return "Stripe is for stores in the UK, US and Canada. Use Paystack for card payments in Africa.";
  }
  if (!STRIPE_CURRENCIES.has(store.currency)) {
    return `Stripe card payments need your store currency to be ${[...STRIPE_CURRENCIES].join(", ")}. Change it in Settings.`;
  }
  return null;
}

/**
 * The Stripe onboarding page for this store: creates the connected account
 * the first time, then (re)generates a fresh onboarding link -- links are
 * single-use and short-lived, so this also serves Stripe's "refresh" URL.
 */
export async function getOnboardingUrl(storeId: string, ownerEmail: string | null, origin: string) {
  const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!store) throw new StripeConnectError("Store not found");
  if (!stripeConfigured()) throw new StripeConnectError("Connect your Stripe account with your API key instead.");
  const blocked = stripeEligibility(store);
  if (blocked) throw new StripeConnectError(blocked);
  try {
    await assertFeature(storeId, "onlinePayments");
  } catch (error) {
    if (error instanceof SubscriptionServiceError) throw new StripeConnectError(error.message);
    throw error;
  }

  let connection = await getStripeConnection(storeId);
  if (!connection) {
    const status = await createConnectedAccount({ email: store.contactEmail ?? ownerEmail, country: store.country, storeId });
    await saveStatus(storeId, status, false);
    connection = await getStripeConnection(storeId);
  } else if (connection.disconnected) {
    // Reconnecting reuses the merchant's existing Stripe account.
    await saveStatus(storeId, await getAccountStatus(connection.accountId), false);
  }
  return createOnboardingLink(
    connection!.accountId,
    `${origin}/api/payments/stripe/onboard`,
    `${origin}/dashboard/payments?stripe=return`
  );
}

/** Re-reads the account from Stripe (after onboarding, or from the dashboard). */
export async function refreshStripeConnection(storeId: string) {
  const connection = await getStripeConnection(storeId);
  if (!connection) return null;
  const status = await getAccountStatus(connection.accountId);
  await saveStatus(storeId, status);
  return status;
}

/** From Stripe's account.updated webhook: find the store by its connected account id. */
export async function applyAccountUpdate(status: StripeAccountStatus) {
  const [row] = await db
    .select({ storeId: paymentProviders.storeId })
    .from(paymentProviders)
    .where(and(eq(paymentProviders.type, "STRIPE"), sql`${paymentProviders.config}->>'accountId' = ${status.accountId}`))
    .limit(1);
  if (row) await saveStatus(row.storeId, status);
}

/** Stops offering card payment at checkout; the Stripe account itself stays the merchant's. */
export async function disconnectStripe(storeId: string) {
  const connection = await getStripeConnection(storeId);
  if (connection) await saveStatus(storeId, connection, true);
}
