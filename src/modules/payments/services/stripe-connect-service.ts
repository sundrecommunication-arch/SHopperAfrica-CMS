import "server-only";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { paymentProviders, stores } from "@/db/schema";
import { assertFeature, SubscriptionServiceError } from "@/modules/subscriptions/services/subscription-service";
import { getCountry, STRIPE_CURRENCIES } from "@/modules/regions/countries";
import {
  createConnectedAccount,
  createOnboardingLink,
  getAccountStatus,
  stripeConfigured,
  type StripeAccountStatus,
} from "../adapters/stripe-adapter";

// A store's Stripe connection lives in its STRIPE payment_providers row:
// config = { accountId, chargesEnabled, payoutsEnabled, detailsSubmitted,
// disconnected }.
// No secrets -- the platform key is in env, and the merchant's own keys stay
// with Stripe. isEnabled = chargesEnabled and not switched off by the
// merchant: checkout only offers card payment once Stripe says the account
// can take charges.

export class StripeConnectError extends Error {}

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
  if (!stripeConfigured()) return "Card payments with Stripe are coming soon.";
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
