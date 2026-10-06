import "server-only";
import { cache } from "react";
import { eq, and, count } from "drizzle-orm";

import { db } from "@/db";
import { stores, subscriptions, subscriptionPayments, products } from "@/db/schema";
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
} from "@/modules/payments/adapters/paystack-adapter";
import { PLANS, PERIOD_DAYS, type PlanKey, type PlanLimits } from "../plans";

export class SubscriptionServiceError extends Error {}

/**
 * Shopper's own Paystack account -- where plan payments go. Separate from
 * merchants' keys (payment_providers.config). Falls back to
 * PAYSTACK_SECRET_KEY so a single-account setup keeps working.
 */
export function getPlatformPaystackKey(): string | null {
  return process.env.PLATFORM_PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || null;
}

export interface StorePlan {
  /** The plan the store is entitled to right now (FREE once a period lapses). */
  plan: PlanKey;
  limits: PlanLimits;
  /** The plan on record, even if it has lapsed. */
  subscribedPlan: PlanKey;
  isTrial: boolean;
  currentPeriodEnd: Date | null;
  /** A paid plan or trial whose period has ended. */
  lapsed: boolean;
}

function resolvePlan(sub: {
  plan: PlanKey;
  currentPeriodEnd: Date | null;
  isTrial: boolean;
} | null): StorePlan {
  const subscribedPlan = sub?.plan ?? "FREE";
  const end = sub?.currentPeriodEnd ?? null;
  const lapsed = subscribedPlan !== "FREE" && end !== null && end.getTime() < Date.now();
  const plan: PlanKey = lapsed ? "FREE" : subscribedPlan;
  return {
    plan,
    limits: PLANS[plan].limits,
    subscribedPlan,
    isTrial: sub?.isTrial ?? false,
    currentPeriodEnd: end,
    lapsed,
  };
}

/**
 * The store's effective plan. Expiry is worked out on read, so no cron job
 * is needed to "downgrade" a store -- the moment its period ends it's FREE.
 * cache()'d because a dashboard request may check several limits.
 */
export const getStorePlan = cache(async (storeId: string): Promise<StorePlan> => {
  const [sub] = await db
    .select({
      plan: subscriptions.plan,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      isTrial: subscriptions.isTrial,
    })
    .from(subscriptions)
    .where(eq(subscriptions.storeId, storeId))
    .limit(1);
  return resolvePlan(sub ?? null);
});

/** Dashboard banner text for the store's plan state, or null when there's nothing to say. */
export function getPlanBanner(plan: StorePlan, suspended: boolean): string | null {
  if (suspended) {
    return "Your store has been suspended and isn't visible to customers. Please contact Shopper support.";
  }
  if (plan.lapsed) {
    return `Your ${PLANS[plan.subscribedPlan].name} ${plan.isTrial ? "trial" : "plan"} has ended — you're on the Free plan now.`;
  }
  if (plan.currentPeriodEnd && plan.plan !== "FREE") {
    const daysLeft = Math.ceil((plan.currentPeriodEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (plan.isTrial || daysLeft <= 5) {
      return `Your ${PLANS[plan.plan].name} ${plan.isTrial ? "trial" : "plan"} ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`;
    }
  }
  return null;
}

const UPGRADE_HINT = "Upgrade your plan under Billing to unlock this.";

export async function assertFeature(storeId: string, feature: Exclude<keyof PlanLimits, "maxProducts">) {
  const { limits, plan } = await getStorePlan(storeId);
  if (!limits[feature]) {
    const label: Record<typeof feature, string> = {
      onlinePayments: "Online card payments",
      customDomain: "Custom domains",
      hideBranding: "Removing \"Powered by Shopper\"",
      team: "Team members",
      ads: "The ad performance dashboard",
    };
    throw new SubscriptionServiceError(
      `${label[feature]} isn't included in the ${PLANS[plan].name} plan. ${UPGRADE_HINT}`
    );
  }
}

/** Throws if the store is already at its plan's product limit. */
export async function assertCanAddProduct(storeId: string) {
  const { limits, plan } = await getStorePlan(storeId);
  if (limits.maxProducts === null) return;
  const [row] = await db
    .select({ value: count() })
    .from(products)
    .where(eq(products.storeId, storeId));
  if ((row?.value ?? 0) >= limits.maxProducts) {
    throw new SubscriptionServiceError(
      `The ${PLANS[plan].name} plan allows up to ${limits.maxProducts} products. ${UPGRADE_HINT}`
    );
  }
}

/**
 * Sets a store's plan directly (admin panel, trial backfill). Keeps the
 * cached stores.plan column in step with the subscription row.
 */
export async function setStorePlan(
  storeId: string,
  plan: PlanKey,
  currentPeriodEnd: Date | null,
  isTrial = false
) {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.storeId, storeId))
      .limit(1);

    const values = {
      plan,
      status: "ACTIVE" as const,
      currentPeriodEnd: plan === "FREE" ? null : currentPeriodEnd,
      isTrial: plan === "FREE" ? false : isTrial,
      updatedAt: new Date(),
    };

    if (existing) {
      await tx.update(subscriptions).set(values).where(eq(subscriptions.id, existing.id));
    } else {
      await tx.insert(subscriptions).values({ storeId, ...values });
    }
    await tx.update(stores).set({ plan, updatedAt: new Date() }).where(eq(stores.id, storeId));
  });
}

/**
 * Starts a Paystack checkout for one 30-day period of `plan`, paid into
 * Shopper's own account. Returns the hosted payment page URL.
 */
export async function startPlanCheckout(params: {
  storeId: string;
  plan: PlanKey;
  email: string;
  userId: string;
  callbackUrl: string;
}) {
  const { storeId, plan, email, userId, callbackUrl } = params;
  if (plan === "FREE") {
    throw new SubscriptionServiceError("The Free plan doesn't need a payment.");
  }
  const secretKey = getPlatformPaystackKey();
  if (!secretKey) {
    throw new SubscriptionServiceError(
      "Plan payments aren't set up yet. Please contact Shopper support."
    );
  }

  const amount = PLANS[plan].priceMonthly;
  const reference = `SUB-${storeId.slice(0, 8)}-${Date.now()}`;

  await db.insert(subscriptionPayments).values({
    storeId,
    plan,
    amount: String(amount),
    reference,
    paidByUserId: userId,
  });

  const { authorizationUrl } = await initializePaystackTransaction({
    secretKey,
    email,
    amount,
    reference,
    callbackUrl,
    // `kind` lets the shared Paystack webhook route tell plan payments apart
    // from merchants' customer payments.
    metadata: { kind: "subscription", storeId, plan },
  });

  return { authorizationUrl, reference };
}

/**
 * Verifies a plan payment with Paystack (never trusting the browser) and,
 * the first time it succeeds, extends the store's subscription by one
 * period. Safe to call repeatedly from the callback page and the webhook:
 * the PENDING -> SUCCEEDED update only matches once.
 */
export async function confirmPlanPayment(reference: string) {
  const [payment] = await db
    .select()
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.reference, reference))
    .limit(1);
  if (!payment) {
    throw new SubscriptionServiceError("Payment not found");
  }
  if (payment.status === "SUCCEEDED") {
    return { status: "SUCCEEDED" as const, plan: payment.plan, periodEnd: payment.periodEnd };
  }

  const secretKey = getPlatformPaystackKey();
  if (!secretKey) {
    throw new SubscriptionServiceError("Plan payments aren't set up yet.");
  }

  const result = await verifyPaystackTransaction(secretKey, reference);
  const paid = Boolean(result.status && result.data?.status === "success");
  // Paystack reports kobo; the row stores naira.
  const amountOk = paid && result.data!.amount >= Math.round(parseFloat(payment.amount) * 100);

  if (!paid || !amountOk) {
    if (result.data && result.data.status !== "success" && result.data.status !== "ongoing") {
      await db
        .update(subscriptionPayments)
        .set({ status: "FAILED" })
        .where(
          and(eq(subscriptionPayments.id, payment.id), eq(subscriptionPayments.status, "PENDING"))
        );
    }
    return { status: "FAILED" as const, plan: payment.plan, periodEnd: null };
  }

  return db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(subscriptionPayments)
      .set({ status: "SUCCEEDED", paidAt: new Date() })
      .where(
        and(eq(subscriptionPayments.id, payment.id), eq(subscriptionPayments.status, "PENDING"))
      )
      .returning({ id: subscriptionPayments.id });
    if (!claimed) {
      // Another request (callback vs. webhook) already applied it.
      const [done] = await tx
        .select({ plan: subscriptionPayments.plan, periodEnd: subscriptionPayments.periodEnd })
        .from(subscriptionPayments)
        .where(eq(subscriptionPayments.id, payment.id));
      return { status: "SUCCEEDED" as const, plan: done.plan, periodEnd: done.periodEnd };
    }

    const [sub] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.storeId, payment.storeId))
      .limit(1);

    // Renewing the same paid plan early stacks onto the remaining time;
    // anything else (upgrade, trial, lapsed) starts a fresh period today.
    const now = new Date();
    const stacks =
      sub &&
      !sub.isTrial &&
      sub.plan === payment.plan &&
      sub.currentPeriodEnd &&
      sub.currentPeriodEnd > now;
    const start = stacks ? sub!.currentPeriodEnd! : now;
    const periodEnd = new Date(start.getTime() + PERIOD_DAYS * 24 * 60 * 60 * 1000);

    const values = {
      plan: payment.plan,
      status: "ACTIVE" as const,
      currentPeriodEnd: periodEnd,
      isTrial: false,
      updatedAt: now,
    };
    if (sub) {
      await tx.update(subscriptions).set(values).where(eq(subscriptions.id, sub.id));
    } else {
      await tx.insert(subscriptions).values({ storeId: payment.storeId, ...values });
    }
    await tx
      .update(stores)
      .set({ plan: payment.plan, updatedAt: now })
      .where(eq(stores.id, payment.storeId));
    await tx
      .update(subscriptionPayments)
      .set({ periodEnd })
      .where(eq(subscriptionPayments.id, payment.id));

    return { status: "SUCCEEDED" as const, plan: payment.plan, periodEnd };
  });
}

export async function listPlanPayments(storeId: string) {
  return db
    .select()
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.storeId, storeId))
    .orderBy(subscriptionPayments.createdAt);
}
