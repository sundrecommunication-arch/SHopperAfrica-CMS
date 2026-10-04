import "server-only";
import { eq, and, desc, sum, count, gte, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { orders, orderItems, customers } from "@/db/schema";

export interface AnalyticsDateRange {
  from?: Date | null;
  to?: Date | null;
}

function dateConditions(range: AnalyticsDateRange | undefined) {
  const conditions = [];
  if (range?.from) conditions.push(gte(orders.createdAt, range.from));
  if (range?.to) conditions.push(lte(orders.createdAt, range.to));
  return conditions;
}

/**
 * Store performance summary, optionally scoped to a date range (the
 * dashboard's shared Daily/Weekly/Monthly/Custom filter -- see
 * src/lib/date-range.ts). Every order-based figure here is scoped to the
 * range when one is given; `totalCustomers` is the exception -- with no
 * range it's the store's all-time customer count, but with a range it
 * switches to "distinct customers who ordered in this period" instead,
 * since "all customers ever" wouldn't actually answer what a date filter
 * is for.
 */
export async function getStoreAnalytics(storeId: string, range?: AnalyticsDateRange) {
  const dc = dateConditions(range);
  const hasRange = dc.length > 0;

  const [
    [totalOrdersRow],
    [paidOrdersRow],
    [paidSalesRow],
    [customerCountRow],
    statusBreakdown,
    paymentMethodBreakdown,
    topProductsRows,
  ] = await Promise.all([
    // Total orders
    db
      .select({ value: count() })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), ...dc)),

    // Paid orders
    db
      .select({ value: count() })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.paymentStatus, "PAID"), ...dc)),

    // Total Paid Revenue
    db
      .select({ value: sum(orders.total) })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.paymentStatus, "PAID"), ...dc)),

    // Customer count -- distinct order-placers in range, else all-time total
    hasRange
      ? db
          .select({ value: sql<string>`count(distinct ${orders.customerId})` })
          .from(orders)
          .where(and(eq(orders.storeId, storeId), ...dc))
      : db.select({ value: count() }).from(customers).where(eq(customers.storeId, storeId)),

    // Fulfillment Status distribution
    db
      .select({
        status: orders.fulfillmentStatus,
        count: count(),
      })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), ...dc))
      .groupBy(orders.fulfillmentStatus),

    // Payment Method distribution
    db
      .select({
        method: orders.paymentMethod,
        count: count(),
        total: sum(orders.total),
      })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), ...dc))
      .groupBy(orders.paymentMethod),

    // Top selling products
    db
      .select({
        productName: orderItems.productName,
        totalQuantity: sum(orderItems.quantity),
        totalRevenue: sum(orderItems.lineTotal),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(orders.storeId, storeId), ...dc))
      .groupBy(orderItems.productName)
      .orderBy(desc(sum(orderItems.quantity)))
      .limit(5),
  ]);

  const totalOrders = totalOrdersRow?.value ?? 0;
  const paidOrders = paidOrdersRow?.value ?? 0;
  const totalRevenue = paidSalesRow?.value ? parseFloat(paidSalesRow.value) : 0;
  const avgOrderValue = paidOrders > 0 ? totalRevenue / paidOrders : 0;
  const totalCustomers =
    typeof customerCountRow?.value === "string"
      ? parseInt(customerCountRow.value, 10)
      : customerCountRow?.value ?? 0;

  return {
    totalRevenue,
    totalOrders,
    paidOrders,
    totalCustomers,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    statusBreakdown,
    paymentMethodBreakdown: paymentMethodBreakdown.map((p) => ({
      method: p.method || "Other",
      count: p.count,
      total: p.total ? parseFloat(p.total) : 0,
    })),
    topProducts: topProductsRows.map((tp) => ({
      productName: tp.productName,
      quantity: tp.totalQuantity ? parseInt(String(tp.totalQuantity), 10) : 0,
      revenue: tp.totalRevenue ? parseFloat(tp.totalRevenue) : 0,
    })),
  };
}

/**
 * Daily paid-revenue trend between `from` and `to` (inclusive), used by the
 * Analytics page's sales trend chart. Always returns one entry per day in
 * range, oldest first, even for days with zero paid orders -- so the chart
 * has a consistent number of points to draw instead of gaps.
 *
 * Buckets in JS off two raw columns rather than a SQL date_trunc/group-by,
 * since a store's order volume in a typical range is small and this avoids
 * relying on how drizzle/node-postgres happens to type a cast date column.
 * The caller is expected to keep the (from, to) span reasonable for a chart
 * (the Analytics page caps it at 60 days) -- this function itself doesn't cap.
 */
export async function getStoreSalesTrend(storeId: string, range: { from: Date; to: Date }) {
  const since = new Date(range.from);
  since.setHours(0, 0, 0, 0);
  const until = range.to;

  const rows = await db
    .select({ createdAt: orders.createdAt, total: orders.total })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, storeId),
        eq(orders.paymentStatus, "PAID"),
        gte(orders.createdAt, since),
        lte(orders.createdAt, until)
      )
    );

  const byDay = new Map<string, { revenue: number; orderCount: number }>();
  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { revenue: 0, orderCount: 0 };
    entry.revenue += parseFloat(row.total);
    entry.orderCount += 1;
    byDay.set(key, entry);
  }

  const days = Math.max(1, Math.ceil((until.getTime() - since.getTime()) / 86_400_000) + 1);
  const trend: { date: string; revenue: number; orderCount: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const entry = byDay.get(key);
    trend.push({ date: key, revenue: entry?.revenue ?? 0, orderCount: entry?.orderCount ?? 0 });
  }
  return trend;
}
