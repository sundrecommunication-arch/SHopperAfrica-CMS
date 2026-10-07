import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  pgEnum,
  unique,
  boolean,
} from "drizzle-orm/pg-core";
import { stores } from "./tenant";
import { orders } from "./orders";
import { customers } from "./customers";

export const discountTypeEnum = pgEnum("discount_type", ["PERCENTAGE", "FIXED"]);

export const discounts = pgTable(
  "discounts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    type: discountTypeEnum("type").notNull(),
    value: numeric("value", { precision: 12, scale: 2 }).notNull(),
    minOrderAmount: numeric("min_order_amount", { precision: 12, scale: 2 }),
    startsAt: timestamp("starts_at"),
    expiresAt: timestamp("expires_at"),
    usageLimit: integer("usage_limit"),
    usageCount: integer("usage_count").notNull().default(0),
    // restrict to specific products/categories; empty = applies store-wide
    productIds: jsonb("product_ids").$type<string[]>().default([]),
    categoryIds: jsonb("category_ids").$type<string[]>().default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("discounts_store_code_unique").on(t.storeId, t.code)]
).enableRLS();

export const discountUsages = pgTable("discount_usages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  discountId: text("discount_id")
    .notNull()
    .references(() => discounts.id, { onDelete: "cascade" }),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  usedAt: timestamp("used_at").notNull().defaultNow(),
}).enableRLS();

// Simple named zones (e.g. "Lagos", "Abuja") with a flat rate — matches the
// V1 simplicity goal in docs section 27. Zone-by-polygon can come later.
export const shippingZones = pgTable("shipping_zones", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  regions: jsonb("regions").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();

export const shippingRates = pgTable("shipping_rates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  zoneId: text("zone_id")
    .notNull()
    .references(() => shippingZones.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  freeAboveAmount: numeric("free_above_amount", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();
