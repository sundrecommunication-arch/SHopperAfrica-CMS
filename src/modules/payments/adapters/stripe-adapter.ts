import "server-only";
import Stripe from "stripe";

// Card payments for stores outside Africa, on the merchant's OWN Stripe
// account -- customers pay the merchant directly, refunds/disputes/payouts
// happen in their Stripe dashboard. Two ways to reach that account:
//
// - Own keys (the default): the merchant pastes a Stripe key, like Paystack
//   keys. Shopper needs no Stripe account of its own. No per-sale fee.
// - Stripe Connect (only when Shopper has a platform account, i.e.
//   STRIPE_SECRET_KEY is set): Stripe-hosted signup, "direct charges" on the
//   connected account, optional Shopper fee (STRIPE_PLATFORM_FEE_PERCENT).
//   Webhooks: STRIPE_WEBHOOK_SECRET / STRIPE_CONNECT_WEBHOOK_SECRET.

/** How to reach a merchant's Stripe account. */
export type StripeCredentials = { secretKey: string } | { accountId: string };

let client: Stripe | null = null;
const keyClients = new Map<string, Stripe>();

function makeClient(key: string) {
  // STRIPE_API_BASE is for local testing against a fake Stripe only.
  const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
  return new Stripe(key, {
    appInfo: { name: "Shopper" },
    maxNetworkRetries: 1,
    ...(base && {
      host: base.hostname,
      port: Number(base.port) || (base.protocol === "https:" ? 443 : 80),
      protocol: base.protocol.replace(":", "") as "http" | "https",
    }),
  });
}

function keyClient(secretKey: string) {
  let c = keyClients.get(secretKey);
  if (!c) {
    c = makeClient(secretKey);
    keyClients.set(secretKey, c);
  }
  return c;
}

/** The client and per-request options for a merchant's account. */
function target(creds: StripeCredentials): { stripe: Stripe; options: Stripe.RequestOptions } {
  return "secretKey" in creds
    ? { stripe: keyClient(creds.secretKey), options: {} }
    : { stripe: getStripe(), options: { stripeAccount: creds.accountId } };
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Card payments with Stripe aren't switched on yet.");
  client = makeClient(key);
  return client;
}

/** "sk_live_..." / "rk_test_..." etc. -- a secret or restricted key, never a publishable one. */
export function isStripeSecretKey(key: string) {
  return /^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/.test(key);
}

export const isLiveKey = (key: string) => /^(sk|rk)_live_/.test(key);

/**
 * Checks a merchant's key works and can do what checkout needs (read and
 * create Checkout Sessions -- all a restricted key needs). Throws Stripe's
 * error message otherwise.
 */
export async function checkMerchantKey(secretKey: string) {
  await keyClient(secretKey).checkout.sessions.list({ limit: 1 });
}

export interface StripeAccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

export function toStatus(account: Stripe.Account): StripeAccountStatus {
  return {
    accountId: account.id,
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
  };
}

/** A new connected account the merchant fully owns (full Stripe dashboard, pays their own Stripe fees). */
export async function createConnectedAccount(params: { email?: string | null; country: string; storeId: string }) {
  const account = await getStripe().accounts.create({
    country: params.country,
    ...(params.email && { email: params.email }),
    controller: {
      stripe_dashboard: { type: "full" },
      fees: { payer: "account" },
      losses: { payments: "stripe" },
      requirement_collection: "stripe",
    },
    metadata: { shopperStoreId: params.storeId },
  });
  return toStatus(account);
}

/** Stripe-hosted onboarding for the merchant (identity, bank account). Links expire after a few minutes. */
export async function createOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string) {
  const link = await getStripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: refreshUrl,
    return_url: returnUrl,
  });
  return link.url;
}

export async function getAccountStatus(accountId: string) {
  return toStatus(await getStripe().accounts.retrieve(accountId));
}

/** Shopper's cut of a sale in minor units (STRIPE_PLATFORM_FEE_PERCENT, default 0 = none). */
function platformFee(amountMinor: number) {
  const percent = Number(process.env.STRIPE_PLATFORM_FEE_PERCENT ?? 0);
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.floor((amountMinor * Math.min(percent, 20)) / 100);
}

/**
 * A Stripe-hosted checkout page for one order, created on the merchant's
 * account so the money goes straight to them. One line for the whole order:
 * Shopper has already priced items, discount, delivery and tax server-side.
 */
export async function createOrderCheckout(params: {
  credentials: StripeCredentials;
  currency: string;
  amount: number;
  orderNumber: string;
  storeName: string;
  customerEmail: string;
  returnUrl: string;
  metadata: Record<string, string>;
}) {
  const amountMinor = Math.round(params.amount * 100);
  // A Shopper fee only exists with Connect; with the merchant's own keys
  // the whole payment is theirs.
  const fee = "accountId" in params.credentials ? platformFee(amountMinor) : 0;
  const { stripe, options } = target(params.credentials);
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: params.customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: params.currency.toLowerCase(),
            unit_amount: amountMinor,
            product_data: { name: `Order ${params.orderNumber} from ${params.storeName}` },
          },
        },
      ],
      success_url: params.returnUrl,
      cancel_url: params.returnUrl,
      client_reference_id: params.metadata.orderId,
      metadata: params.metadata,
      payment_intent_data: {
        metadata: params.metadata,
        ...(fee > 0 && { application_fee_amount: fee }),
      },
    },
    options
  );
  if (!session.url) throw new Error("Stripe didn't return a checkout page");
  return { sessionId: session.id, url: session.url };
}

export async function getOrderCheckout(credentials: StripeCredentials, sessionId: string) {
  const { stripe, options } = target(credentials);
  return stripe.checkout.sessions.retrieve(sessionId, {}, options);
}

/** Verifies a Connect (platform) webhook against each configured endpoint secret; throws if none match. */
export function parseWebhookEvent(rawBody: string, signature: string | null): Stripe.Event {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(
    (s): s is string => Boolean(s)
  );
  if (!signature || secrets.length === 0) throw new Error("Stripe webhook isn't configured");
  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return getStripe().webhooks.constructEvent(rawBody, signature, secret);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/** Verifies a webhook a merchant set up on their own Stripe account, with its signing secret. */
export function parseMerchantWebhookEvent(rawBody: string, signature: string | null, secretKey: string, webhookSecret: string) {
  if (!signature) throw new Error("Missing Stripe signature");
  return keyClient(secretKey).webhooks.constructEvent(rawBody, signature, webhookSecret);
}

export type { Stripe };
