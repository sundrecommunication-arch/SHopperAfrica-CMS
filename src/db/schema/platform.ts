import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  unique,
  numeric,
} from "drizzle-orm/pg-core";
import { stores } from "./tenant";
import { users } from "./auth";
import { orders } from "./orders";
import { planEnum } from "./tenant";

// System-provided storefront themes a merchant can pick from (docs section 17).
// Seeded once; storeId is null for built-in themes.
export const themes = pgTable("themes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(), // "minimal" | "modern" | "fashion" | ...
  name: text("name").notNull(),
  description: text("description"),
  previewImageUrl: text("preview_image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();

// Extended, rarely-changed store settings that don't belong on the hot
// `stores` row. One row per store.
export const storeSettings = pgTable("store_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .unique()
    .references(() => stores.id, { onDelete: "cascade" }),

  emailNotificationsEnabled: boolean("email_notifications_enabled").notNull().default(true),
  orderNotificationsEnabled: boolean("order_notifications_enabled").notNull().default(true),
  customerNotificationsEnabled: boolean("customer_notifications_enabled").notNull().default(true),

  taxEnabled: boolean("tax_enabled").notNull().default(false),
  taxRatePercent: text("tax_rate_percent"), // simple text/decimal string, kept optional
  taxIncludedInPrice: boolean("tax_included_in_price").notNull().default(false),

  seoMetaTitle: text("seo_meta_title"),
  seoMetaDescription: text("seo_meta_description"),
  socialShareImageUrl: text("social_share_image_url"),

  homepageLayout: jsonb("homepage_layout").$type<Record<string, unknown>>().default({}),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

export const notificationTypeEnum = pgEnum("notification_type", [
  "NEW_ORDER",
  "PAYMENT_RECEIVED",
  "LOW_STOCK",
  "PAYMENT_FAILED",
  "ORDER_CANCELLED",
  "ORDER_STATUS_UPDATE",
]);

export const notifications = pgTable("notifications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }), // null = customer-facing
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  relatedOrderId: text("related_order_id").references(() => orders.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ACTIVE",
  "CANCELED",
  "PAST_DUE",
]);

export const subscriptions = pgTable("subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .unique()
    .references(() => stores.id, { onDelete: "cascade" }),
  plan: planEnum("plan").notNull().default("FREE"),
  status: subscriptionStatusEnum("status").notNull().default("ACTIVE"),
  // Paid plans run until currentPeriodEnd, then the store falls back to FREE
  // (worked out on read -- see modules/subscriptions). null = no end (FREE).
  currentPeriodEnd: timestamp("current_period_end"),
  isTrial: boolean("is_trial").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

// Plan-driven feature flags, e.g. { key: "custom_domain", enabled: true }.
// Lets plans change later without rewriting the application (docs section 34).
export const featureEntitlements = pgTable(
  "feature_entitlements",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // e.g. "custom_domain", "analytics.advanced", "products.unlimited"
    enabled: boolean("enabled").notNull().default(false),
    limitValue: text("limit_value"), // optional numeric limit stored as text, e.g. max products
  },
  (t) => [unique("feature_entitlements_store_key_unique").on(t.storeId, t.key)]
).enableRLS();

export const auditLogs = pgTable("audit_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // e.g. "product.created", "store.settings_updated"
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();

// One row per plan purchase through Shopper's own Paystack account (not a
// merchant's). PENDING until verified server-side; each SUCCEEDED row adds
// one 30-day period to the store's subscription.
export const subscriptionPayments = pgTable("subscription_payments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  plan: planEnum("plan").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  reference: text("reference").notNull().unique(),
  status: text("status").$type<"PENDING" | "SUCCEEDED" | "FAILED">().notNull().default("PENDING"),
  paidByUserId: text("paid_by_user_id").references(() => users.id, { onDelete: "set null" }),
  periodEnd: timestamp("period_end"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();

// Automated emails to merchants after they sign up (welcome, onboarding tips,
// "need help?" nudges, trial ending). One row per (user, kind) so the hourly
// cron in src/app/api/cron/lifecycle can never send the same email twice.
export const lifecycleEmails = pgTable(
  "lifecycle_emails",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind")
      .$type<"WELCOME" | "ONBOARDING" | "NEED_HELP" | "NO_ORDERS" | "TRIAL_ENDING">()
      .notNull(),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
  },
  (t) => [unique("lifecycle_emails_user_kind_unique").on(t.userId, t.kind)]
).enableRLS();

// Merchants who clicked "unsubscribe" in a tips/nudge email. Kept in its own
// table (not a users column) so these emails stop without touching the hot
// users row. Welcome and trial-ending emails are account notices and still go.
export const emailOptOuts = pgTable("email_opt_outs", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();
