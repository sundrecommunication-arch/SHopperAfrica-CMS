import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  pgEnum,
  primaryKey,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { stores } from "./tenant";

export const productStatusEnum = pgEnum("product_status", ["DRAFT", "ACTIVE", "ARCHIVED"]);

export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  parentId: text("parent_id").references((): AnyPgColumn => categories.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

export const products = pgTable("products", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  status: productStatusEnum("status").notNull().default("DRAFT"),
  productType: text("product_type"),
  brand: text("brand"),
  tags: jsonb("tags").$type<string[]>().default([]),

  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  compareAtPrice: numeric("compare_at_price", { precision: 12, scale: 2 }),
  sku: text("sku"),
  weight: numeric("weight", { precision: 10, scale: 3 }),

  // Inventory (kept simple per docs section 12 — a dedicated ledger can be added later)
  trackInventory: boolean("track_inventory").notNull().default(true),
  inventoryQuantity: integer("inventory_quantity").notNull().default(0),
  allowBackorder: boolean("allow_backorder").notNull().default(false),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(3),

  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

export const productImages = pgTable("product_images", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();

// Product options, e.g. { "Color": "Black", "Size": "M" }
export const productVariants = pgTable("product_variants", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // display name, e.g. "Black / M"
  options: jsonb("options").$type<Record<string, string>>().notNull().default({}),
  sku: text("sku"),
  price: numeric("price", { precision: 12, scale: 2 }),
  compareAtPrice: numeric("compare_at_price", { precision: 12, scale: 2 }),
  inventoryQuantity: integer("inventory_quantity").notNull().default(0),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

export const productCategories = pgTable(
  "product_categories",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.categoryId] })]
).enableRLS();
