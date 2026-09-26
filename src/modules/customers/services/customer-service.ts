import "server-only";
import { eq, and, desc, count, sum, max } from "drizzle-orm";

import { db } from "@/db";
import { customers, orders, addresses } from "@/db/schema";

export class CustomerServiceError extends Error {}

/**
 * Lists customers for a merchant's store with aggregated order metrics.
 */
export async function listStoreCustomers(
  storeId: string,
  options?: { search?: string }
) {
  const customerRows = await db
    .select()
    .from(customers)
    .where(eq(customers.storeId, storeId))
    .orderBy(desc(customers.createdAt));

  if (customerRows.length === 0) return [];

  // Aggregate metrics from orders table
  const orderStats = await db
    .select({
      customerId: orders.customerId,
      orderCount: count(),
      totalSpent: sum(orders.total),
      lastOrderDate: max(orders.createdAt),
    })
    .from(orders)
    .where(eq(orders.storeId, storeId))
    .groupBy(orders.customerId);

  const statsMap = new Map(orderStats.map((s) => [s.customerId, s]));

  const result = customerRows.map((c) => {
    const stats = statsMap.get(c.id);
    return {
      ...c,
      totalOrders: stats?.orderCount ?? 0,
      totalSpent: stats?.totalSpent ? parseFloat(stats.totalSpent) : 0,
      lastOrderDate: stats?.lastOrderDate ?? null,
    };
  });

  if (options?.search && options.search.trim()) {
    const term = options.search.toLowerCase().trim();
    return result.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        c.email?.toLowerCase().includes(term)
    );
  }

  return result;
}

/**
 * Retrieves full customer profile, order history, and saved addresses.
 */
export async function getCustomerById(storeId: string, customerId: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.storeId, storeId)))
    .limit(1);

  if (!customer) return null;

  const [customerOrders, customerAddresses] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        total: orders.total,
        fulfillmentStatus: orders.fulfillmentStatus,
        paymentStatus: orders.paymentStatus,
        checkoutChannel: orders.checkoutChannel,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(eq(orders.customerId, customer.id), eq(orders.storeId, storeId)))
      .orderBy(desc(orders.createdAt)),
    db
      .select()
      .from(addresses)
      .where(eq(addresses.customerId, customer.id))
      .orderBy(desc(addresses.createdAt)),
  ]);

  const totalSpent = customerOrders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((sum, o) => sum + parseFloat(o.total), 0);

  return {
    customer,
    orders: customerOrders,
    addresses: customerAddresses,
    totalSpent,
    totalOrders: customerOrders.length,
  };
}

/**
 * Updates merchant notes for a customer.
 */
export async function updateCustomerNotes(
  storeId: string,
  customerId: string,
  notes: string | null
) {
  const [updated] = await db
    .update(customers)
    .set({
      notes,
      updatedAt: new Date(),
    })
    .where(and(eq(customers.id, customerId), eq(customers.storeId, storeId)))
    .returning();

  if (!updated) {
    throw new CustomerServiceError("Customer not found");
  }

  return updated;
}
