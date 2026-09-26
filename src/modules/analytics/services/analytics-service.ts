import "server-only";
import { eq, and, desc, sum, count } from "drizzle-orm";

import { db } from "@/db";
import { orders, orderItems, customers } from "@/db/schema";

export async function getStoreAnalytics(storeId: string) {
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
    db.select({ value: count() }).from(orders).where(eq(orders.storeId, storeId)),

    // Paid orders
    db
      .select({ value: count() })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.paymentStatus, "PAID"))),

    // Total Paid Revenue
    db
      .select({ value: sum(orders.total) })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.paymentStatus, "PAID"))),

    // Customer count
    db.select({ value: count() }).from(customers).where(eq(customers.storeId, storeId)),

    // Fulfillment Status distribution
    db
      .select({
        status: orders.fulfillmentStatus,
        count: count(),
      })
      .from(orders)
      .where(eq(orders.storeId, storeId))
      .groupBy(orders.fulfillmentStatus),

    // Payment Method distribution
    db
      .select({
        method: orders.paymentMethod,
        count: count(),
        total: sum(orders.total),
      })
      .from(orders)
      .where(eq(orders.storeId, storeId))
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
      .where(eq(orders.storeId, storeId))
      .groupBy(orderItems.productName)
      .orderBy(desc(sum(orderItems.quantity)))
      .limit(5),
  ]);

  const totalOrders = totalOrdersRow?.value ?? 0;
  const paidOrders = paidOrdersRow?.value ?? 0;
  const totalRevenue = paidSalesRow?.value ? parseFloat(paidSalesRow.value) : 0;
  const avgOrderValue = paidOrders > 0 ? totalRevenue / paidOrders : 0;

  return {
    totalRevenue,
    totalOrders,
    paidOrders,
    totalCustomers: customerCountRow?.value ?? 0,
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
