import { pgTable, text, timestamp, numeric, pgEnum, unique } from "drizzle-orm/pg-core";
import { stores } from "./tenant";
import { orders } from "./orders";
import { suppliers } from "./dropship";

// Kept apart from dropship.ts: orders -> catalog -> dropship would otherwise
// import in a circle.

export const supplierOrderStatusEnum = pgEnum("supplier_order_status", [
  "NEW",
  "ACCEPTED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

// One per (paid order, supplier): what that supplier has to deliver for an
// order and what they're paid for it (already split to them by Paystack).
export const supplierOrders = pgTable(
  "supplier_orders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    status: supplierOrderStatusEnum("status").notNull().default("NEW"),
    amountDue: numeric("amount_due", { precision: 12, scale: 2 }).notNull(),
    trackingNote: text("tracking_note"), // e.g. "GIG Logistics, waybill 12345"
    shippedAt: timestamp("shipped_at"),
    deliveredAt: timestamp("delivered_at"),
    // Supplier reported they can't deliver (out of stock, etc.); Shopper
    // follows up and refunds. Cleared only by cancelling.
    problemNote: text("problem_note"),
    problemAt: timestamp("problem_at"),
    // Hourly cron (src/app/api/cron/lifecycle): reminder to the supplier
    // after 2 days unshipped, alert to Shopper after 4.
    reminderSentAt: timestamp("reminder_sent_at"),
    // Worldwide (CJ) orders: CJ's order id and last known CJ status.
    externalOrderId: text("external_order_id"),
    externalStatus: text("external_status"),
    escalatedAt: timestamp("escalated_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("supplier_orders_order_supplier_unique").on(t.orderId, t.supplierId)]
).enableRLS();
