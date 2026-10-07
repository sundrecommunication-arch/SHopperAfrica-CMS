import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { stores } from "./tenant";
import { customers } from "./customers";
import { products, productVariants } from "./catalog";
import { users } from "./auth";

// Payment status and fulfillment status are tracked separately — never
// combine them into one field (docs section 22).
export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);

export const fulfillmentStatusEnum = pgEnum("fulfillment_status", [
  "NEW",
  "CONFIRMED",
  "PROCESSING",
  "READY",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

export const checkoutChannelEnum = pgEnum("checkout_channel", ["WEBSITE", "WHATSAPP"]);

export const orders = pgTable("orders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  orderNumber: text("order_number").notNull(), // human-readable, e.g. QS-1042 — unique per store
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),

  fulfillmentStatus: fulfillmentStatusEnum("fulfillment_status").notNull().default("NEW"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
  checkoutChannel: checkoutChannelEnum("checkout_channel").notNull().default("WEBSITE"),

  // Every amount here is calculated server-side at order creation — never
  // trust a total submitted by the client (docs section 40/76).
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  shippingAmount: numeric("shipping_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),

  paymentMethod: text("payment_method"), // e.g. "Bank Transfer", "Cash on Delivery"
  deliveryMethod: text("delivery_method"), // snapshot of the chosen delivery option's name, e.g. "Lagos", "Pickup"
  deliveryAddressText: text("delivery_address_text"),
  customerNotes: text("customer_notes"),
  whatsappMessage: text("whatsapp_message"), // the generated order message, if applicable

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

export const orderItems = pgTable("order_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: text("variant_id").references(() => productVariants.id, { onDelete: "set null" }),

  // Snapshots — product data can change after the order is placed.
  productName: text("product_name").notNull(),
  variantName: text("variant_name"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
}).enableRLS();

// Logs each time a merchant taps "Nudge on WhatsApp" on an abandoned
// checkout (src/app/dashboard/abandoned-carts) — lets the dashboard show
// nudge history and avoid the merchant losing track of who's been contacted.
export const abandonedCartNudges = pgTable("abandoned_cart_nudges", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  sentByUserId: text("sent_by_user_id").references(() => users.id, { onDelete: "set null" }),
  channel: text("channel").notNull().default("whatsapp"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();
