import "server-only";
import Stripe from "stripe";

// Card payments for stores outside Africa, through Stripe Connect.
//
// Each merchant connects their OWN Stripe account (Stripe's "standard"
// setup: Stripe runs their identity checks, they see everything in their
// own Stripe dashboard, they handle refunds and disputes there, and Stripe
// pays out to their bank). Shopper's platform account only creates the
// accounts and the checkout pages; customers pay the merchant directly
// ("direct charges"), with an optional Shopper fee per sale.
//
// Env: STRIPE_SECRET_KEY (Shopper's platform account), STRIPE_WEBHOOK_SECRET
// and/or STRIPE_CONNECT_WEBHOOK_SECRET (the endpoint listening to connected
// accounts' events), STRIPE_PLATFORM_FEE_PERCENT (default 0).

let client: Stripe | null = null;

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Card payments with Stripe aren't switched on yet.");
  // STRIPE_API_BASE is for local testing against a fake Stripe only.
  const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
  client = new Stripe(key, {
    appInfo: { name: "Shopper" },
    ...(base && {
      host: base.hostname,
      port: Number(base.port) || (base.protocol === "https:" ? 443 : 80),
      protocol: base.protocol.replace(":", "") as "http" | "https",
    }),
  });
  return client;
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
  accountId: string;
  currency: string;
  amount: number;
  orderNumber: string;
  storeName: string;
  customerEmail: string;
  returnUrl: string;
  metadata: Record<string, string>;
}) {
  const amountMinor = Math.round(params.amount * 100);
  const fee = platformFee(amountMinor);
  const session = await getStripe().checkout.sessions.create(
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
    { stripeAccount: params.accountId }
  );
  if (!session.url) throw new Error("Stripe didn't return a checkout page");
  return { sessionId: session.id, url: session.url };
}

export async function getOrderCheckout(accountId: string, sessionId: string) {
  return getStripe().checkout.sessions.retrieve(sessionId, {}, { stripeAccount: accountId });
}

/** Verifies a webhook's signature against each configured endpoint secret; throws if none match. */
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

export type { Stripe };
