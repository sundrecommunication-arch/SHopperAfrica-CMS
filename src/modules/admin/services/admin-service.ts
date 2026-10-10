import "server-only";
import { eq, desc, ne, and, gte, sql, ilike, or, count } from "drizzle-orm";

import { db } from "@/db";
import {
  stores,
  users,
  orders,
  products,
  subscriptions,
  subscriptionPayments,
  auditLogs,
} from "@/db/schema";
import { getLifecycleHistory } from "@/modules/lifecycle/services/lifecycle-service";
import { setStorePlan } from "@/modules/subscriptions/services/subscription-service";
import { PLAN_ORDER, type PlanKey } from "@/modules/subscriptions/plans";

// Platform-admin queries. These deliberately read ACROSS stores, so they
// must only ever be called behind requirePlatformAdmin*() (src/lib/platform-admin.ts)
// -- never from merchant-facing code.

export class AdminServiceError extends Error {}

function effectivePlan(plan: PlanKey | null, periodEnd: Date | null): PlanKey {
  if (!plan || plan === "FREE") return "FREE";
  return periodEnd && periodEnd.getTime() < Date.now() ? "FREE" : plan;
}

export async function getPlatformOverview() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    [storeCounts],
    [userCount],
    salesByCurrency,
    [revenueAll],
    [revenue30],
    planRows,
    recentStores,
    recentPayments,
  ] = await Promise.all([
    db
      .select({
        total: count(),
        published: sql<number>`count(*) filter (where ${stores.isPublished})`.mapWith(Number),
        suspended: sql<number>`count(*) filter (where ${stores.suspendedAt} is not null)`.mapWith(Number),
      })
      .from(stores),
    db.select({ value: count() }).from(users),
    db
      .select({
        currency: stores.currency,
        orders: count(),
        sales: sql<string>`coalesce(sum(${orders.total}), 0)`,
      })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .where(ne(orders.fulfillmentStatus, "CANCELLED"))
      .groupBy(stores.currency),
    db
      .select({ value: sql<string>`coalesce(sum(${subscriptionPayments.amount}), 0)` })
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.status, "SUCCEEDED")),
    db
      .select({ value: sql<string>`coalesce(sum(${subscriptionPayments.amount}), 0)` })
      .from(subscriptionPayments)
      .where(
        and(eq(subscriptionPayments.status, "SUCCEEDED"), gte(subscriptionPayments.paidAt, since30))
      ),
    db
      .select({ plan: subscriptions.plan, periodEnd: subscriptions.currentPeriodEnd, isTrial: subscriptions.isTrial })
      .from(stores)
      .leftJoin(subscriptions, eq(subscriptions.storeId, stores.id)),
    db
      .select({ id: stores.id, name: stores.name, slug: stores.slug, createdAt: stores.createdAt })
      .from(stores)
      .orderBy(desc(stores.createdAt))
      .limit(5),
    db
      .select({
        id: subscriptionPayments.id,
        storeId: subscriptionPayments.storeId,
        storeName: stores.name,
        plan: subscriptionPayments.plan,
        amount: subscriptionPayments.amount,
        paidAt: subscriptionPayments.paidAt,
      })
      .from(subscriptionPayments)
      .innerJoin(stores, eq(stores.id, subscriptionPayments.storeId))
      .where(eq(subscriptionPayments.status, "SUCCEEDED"))
      .orderBy(desc(subscriptionPayments.paidAt))
      .limit(5),
  ]);

  const planCounts = Object.fromEntries(PLAN_ORDER.map((p) => [p, 0])) as Record<PlanKey, number>;
  let trials = 0;
  for (const row of planRows) {
    const plan = effectivePlan(row.plan, row.periodEnd);
    planCounts[plan] += 1;
    if (row.isTrial && plan !== "FREE") trials += 1;
  }

  return {
    stores: storeCounts,
    users: userCount.value,
    salesByCurrency: salesByCurrency.map((r) => ({ ...r, sales: parseFloat(r.sales) })),
    revenueAllTime: parseFloat(revenueAll.value),
    revenueLast30: parseFloat(revenue30.value),
    planCounts,
    trials,
    recentStores,
    recentPayments,
  };
}

/**
 * Marketing funnel by signup source for the last `days`: sign-ups -> stores
 * created -> activated (>=1 product and >=1 non-cancelled order) -> paying
 * (a current, non-trial paid plan). "direct" = no campaign info recorded.
 */
export async function getSignupFunnelBySource(days = 90) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const source = sql<string>`coalesce(${users.signupAttribution}->>'source', 'direct')`;
  const rows = await db
    .select({
      source,
      signups: sql<number>`count(distinct ${users.id})`.mapWith(Number),
      stores: sql<number>`count(distinct ${stores.id})`.mapWith(Number),
      activated: sql<number>`count(distinct ${stores.id}) filter (where
        exists (select 1 from ${products} where ${products.storeId} = ${stores.id})
        and exists (select 1 from ${orders} where ${orders.storeId} = ${stores.id} and ${orders.fulfillmentStatus} <> 'CANCELLED'))`.mapWith(Number),
      paying: sql<number>`count(distinct ${stores.id}) filter (where
        ${subscriptions.plan} <> 'FREE' and not ${subscriptions.isTrial} and ${subscriptions.currentPeriodEnd} > now())`.mapWith(Number),
    })
    .from(users)
    .leftJoin(stores, eq(stores.ownerId, users.id))
    .leftJoin(subscriptions, eq(subscriptions.storeId, stores.id))
    .where(gte(users.createdAt, since))
    .groupBy(source)
    .orderBy(desc(sql`count(distinct ${users.id})`));
  return rows;
}

export async function listStoresForAdmin(opts: { search?: string; storeId?: string } = {}) {
  const term = opts.search?.trim();
  const rows = await db
    .select({
      id: stores.id,
      name: stores.name,
      slug: stores.slug,
      currency: stores.currency,
      currencySymbol: stores.currencySymbol,
      isPublished: stores.isPublished,
      suspendedAt: stores.suspendedAt,
      suspendedReason: stores.suspendedReason,
      createdAt: stores.createdAt,
      ownerId: stores.ownerId,
      ownerEmail: users.email,
      ownerName: users.name,
      ownerSource: sql<string | null>`${users.signupAttribution}->>'source'`,
      plan: subscriptions.plan,
      periodEnd: subscriptions.currentPeriodEnd,
      isTrial: subscriptions.isTrial,
      productCount: sql<number>`(select count(*) from ${products} where ${products.storeId} = ${stores.id})`.mapWith(Number),
      orderCount: sql<number>`(select count(*) from ${orders} where ${orders.storeId} = ${stores.id} and ${orders.fulfillmentStatus} <> 'CANCELLED')`.mapWith(Number),
      sales: sql<string>`(select coalesce(sum(${orders.total}), 0) from ${orders} where ${orders.storeId} = ${stores.id} and ${orders.fulfillmentStatus} <> 'CANCELLED')`,
    })
    .from(stores)
    .innerJoin(users, eq(users.id, stores.ownerId))
    .leftJoin(subscriptions, eq(subscriptions.storeId, stores.id))
    .where(
      opts.storeId
        ? eq(stores.id, opts.storeId)
        : term
        ? or(
            ilike(stores.name, `%${term}%`),
            ilike(stores.slug, `%${term}%`),
            ilike(users.email, `%${term}%`)
          )
        : undefined
    )
    .orderBy(desc(stores.createdAt));

  return rows.map((r) => ({
    ...r,
    sales: parseFloat(r.sales),
    effectivePlan: effectivePlan(r.plan, r.periodEnd),
  }));
}

export async function getStoreForAdmin(storeId: string) {
  const [store] = await listStoresForAdmin({ storeId });
  if (!store) return null;

  const [recentOrders, payments, log, emails] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        total: orders.total,
        paymentStatus: orders.paymentStatus,
        fulfillmentStatus: orders.fulfillmentStatus,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.storeId, storeId))
      .orderBy(desc(orders.createdAt))
      .limit(10),
    db
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.storeId, storeId))
      .orderBy(desc(subscriptionPayments.createdAt)),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        byEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(and(eq(auditLogs.storeId, storeId), sql`${auditLogs.action} like 'admin.%'`))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20),
    getLifecycleHistory(store.ownerId),
  ]);

  return { store, recentOrders, payments, log, emails };
}

/** Admin override of a store's plan, e.g. a comp, a refund, or a manual bank payment. */
export async function adminSetPlan(params: {
  storeId: string;
  adminUserId: string;
  plan: PlanKey;
  periodEnd: Date | null;
}) {
  const { storeId, adminUserId, plan, periodEnd } = params;
  if (plan !== "FREE" && (!periodEnd || periodEnd.getTime() < Date.now())) {
    throw new AdminServiceError("A paid plan needs an end date in the future.");
  }
  await assertStoreExists(storeId);
  await setStorePlan(storeId, plan, periodEnd);
  await db.insert(auditLogs).values({
    storeId,
    userId: adminUserId,
    action: "admin.plan_changed",
    entityType: "store",
    entityId: storeId,
    metadata: { plan, periodEnd: periodEnd?.toISOString() ?? null },
  });
}

export async function adminSetSuspended(params: {
  storeId: string;
  adminUserId: string;
  suspended: boolean;
  reason?: string;
}) {
  const { storeId, adminUserId, suspended, reason } = params;
  await assertStoreExists(storeId);
  await db
    .update(stores)
    .set({
      suspendedAt: suspended ? new Date() : null,
      suspendedReason: suspended ? reason?.trim() || null : null,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, storeId));
  await db.insert(auditLogs).values({
    storeId,
    userId: adminUserId,
    action: suspended ? "admin.store_suspended" : "admin.store_reinstated",
    entityType: "store",
    entityId: storeId,
    metadata: suspended ? { reason: reason?.trim() || null } : {},
  });
}

async function assertStoreExists(storeId: string) {
  const [row] = await db.select({ id: stores.id }).from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!row) throw new AdminServiceError("Store not found");
}
