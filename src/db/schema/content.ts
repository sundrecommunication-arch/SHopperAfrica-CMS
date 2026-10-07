import { pgTable, text, timestamp, boolean, integer, pgEnum, unique } from "drizzle-orm/pg-core";
import { stores } from "./tenant";
import { products } from "./catalog";

// --- Blog -------------------------------------------------------------------

export const blogPostStatusEnum = pgEnum("blog_post_status", ["DRAFT", "PUBLISHED"]);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(), // unique per store, used in /store/[slug]/blog/[postSlug]
    excerpt: text("excerpt"),
    // Plain text/paragraphs for now (rendered by splitting on blank lines) —
    // no markdown or rich-text editor library in this project yet.
    content: text("content").notNull(),
    coverImageUrl: text("cover_image_url"),
    status: blogPostStatusEnum("status").notNull().default("DRAFT"),
    publishedAt: timestamp("published_at"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("blog_posts_store_slug_unique").on(t.storeId, t.slug)]
).enableRLS();

// --- Store policies (legal pages) --------------------------------------------

export const policyTypeEnum = pgEnum("policy_type", [
  "PRIVACY_POLICY",
  "RETURN_POLICY",
  "SHIPPING_POLICY",
  "TERMS_OF_SERVICE",
]);

// One row per store per policy type. Starts out unpublished with editable
// starter-template content (see src/modules/policies/services/policy-service.ts)
// — a merchant must explicitly turn a policy on before it's reachable on
// the storefront, so nothing goes live unreviewed.
export const storePolicies = pgTable(
  "store_policies",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    type: policyTypeEnum("type").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    isPublished: boolean("is_published").notNull().default(false),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("store_policies_store_type_unique").on(t.storeId, t.type)]
).enableRLS();

// --- Storefront navigation ----------------------------------------------------

export const navItemKindEnum = pgEnum("nav_item_kind", [
  "HOME",
  "PRODUCTS",
  "BLOG",
  "CONTACT",
  "CUSTOM",
]);

// One row per nav entry per store, in menu order (sortOrder). The four
// built-in kinds (HOME, PRODUCTS, BLOG, CONTACT) map to fixed storefront
// routes and can be renamed, hidden, or reordered but never deleted; CUSTOM
// rows are merchant-added links (to another page they've set up, or an
// external URL) and can be added or removed freely.
//
// A store with no rows here has never customized its nav and just gets the
// default four-item menu, in order — see src/modules/nav/constants.ts (the
// shared default) and src/modules/nav/services/nav-service.ts (the
// dashboard-side merge).
export const storeNavItems = pgTable("store_nav_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  kind: navItemKindEnum("kind").notNull(),
  label: text("label").notNull(),
  // Only set (and only meaningful) for CUSTOM items — a relative path like
  // "/store/acme/lookbook" or a full external URL.
  url: text("url"),
  isVisible: boolean("is_visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

// --- FAQs ---------------------------------------------------------------

// A `productId` of null means a STORE-DEFAULT FAQ: shown on the storefront
// home page, and on any product page whose product has no FAQs of its own.
// A row with `productId` set belongs only to that product — as soon as a
// product has at least one of its own, that list replaces the default on
// its page entirely rather than being added to it (see
// getPublicFaqsForProduct in storefront-service.ts).
export const faqs = pgTable("faqs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();
