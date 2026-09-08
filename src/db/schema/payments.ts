import { pgTable, text, timestamp, boolean, numeric, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { stores } from "./tenant";
import { orders } from "./orders";

// Payment providers are adapters, not hard-coded integrations (docs section 21).
export const paymentProviderTypeEnum = pgEnum("payment_provider_type", [
  "MANUAL", // merchant-defined instructions (e.g. bank transfer)
  "CASH_ON_DELIVERY",
  "WHATSAPP",
  "PAYSTACK",
  "FLUTTERWAVE",
  "STRIPE",
  "OTHER",
]);

export const paymentStatusValueEnum = pgEnum("payment_transaction_status", [
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "REFUNDED",
]);

// A store's configured ways to accept payment. `config` holds provider-specific
// settings (bank details for MANUAL, API keys reference for a gateway, etc).
export const paymentProviders = pgTable("payment_providers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  type: paymentProviderTypeEnum("type").notNull(),
  label: text("label").notNull(), // merchant-facing name, e.g. "Bank Transfer"
  isEnabled: boolean("is_enabled").notNull().default(true),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// A transaction attempt against an order. Never mark PAID from a client
// signal alone — always verify server-side against the provider (docs section 69/78).
export const payments = pgTable("payments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  providerId: text("provider_id").references(() => paymentProviders.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  status: paymentStatusValueEnum("status").notNull().default("PENDING"),
  transactionReference: text("transaction_reference"),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
