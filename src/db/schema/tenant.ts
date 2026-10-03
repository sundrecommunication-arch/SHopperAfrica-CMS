import { pgTable, text, timestamp, boolean, integer, pgEnum, unique } from "drizzle-orm/pg-core";
import { users } from "./auth";

// --- Enums -----------------------------------------------------------------

export const storeRoleEnum = pgEnum("store_role", ["OWNER", "MANAGER", "STAFF"]);

export const planEnum = pgEnum("plan", ["FREE", "STARTER", "BUSINESS"]);

export const whatsappOrderBehaviorEnum = pgEnum("whatsapp_order_behavior", [
  "SEND_EVERY_ORDER",
  "CUSTOMER_CHOICE",
  "CONTACT_BUTTON_ONLY",
]);

export const heroTextPositionEnum = pgEnum("hero_text_position", [
  "center",
  "bottom-left",
  "bottom-center",
  "bottom-right",
]);

// --- Tables ------------------------------------------------------------------

// Every tenant-owned table below carries a storeId. Never query these tables
// without filtering by the current session's store — see src/lib/tenant.ts.
export const stores = pgTable("stores", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // used in /store/[slug]
  description: text("description"),
  logoUrl: text("logo_url"),
  // Storefront hero/banner slider — shown at the top of the public store
  // page (src/app/store/[slug]/page.tsx). Empty/absent falls back to a
  // generic placeholder so new stores still render something reasonable.
  heroImages: text("hero_images").array().notNull().default([]),
  // Whether the store name/description/WhatsApp button overlay is drawn on
  // top of the hero slider, and where — off by default since a merchant's
  // hero images often already have their own text/branding baked in.
  heroShowText: boolean("hero_show_text").notNull().default(false),
  heroTextPosition: heroTextPositionEnum("hero_text_position").notNull().default("bottom-center"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  addressText: text("address_text"),
  currency: text("currency").notNull().default("NGN"),
  currencySymbol: text("currency_symbol").notNull().default("₦"),

  // WhatsApp (core differentiator — see docs/master-instruction.md section 18/19)
  whatsappNumber: text("whatsapp_number"),
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
  whatsappOrderBehavior: whatsappOrderBehaviorEnum("whatsapp_order_behavior")
    .notNull()
    .default("CUSTOMER_CHOICE"),

  // Storefront customization
  themeKey: text("theme_key").notNull().default("minimal"),
  primaryColor: text("primary_color").notNull().default("#16a34a"),
  secondaryColor: text("secondary_color").notNull().default("#111827"),

  // SEO & optimisation (dashboard "SEO & Optimisation" settings card) --
  // all optional; when left blank, sensible defaults are generated from
  // the store's own name/description so every merchant gets baseline SEO
  // for free.
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  // Content value only, from Google Search Console's "HTML tag"
  // verification method -- rendered as
  // <meta name="google-site-verification" content="...">. No OAuth/API
  // needed; the merchant connects Search Console independently.
  searchConsoleVerification: text("search_console_verification"),
  // Optional override for /store/[slug]/llms.txt. Left blank, a summary
  // is auto-generated from the store's products, categories and contact
  // info.
  llmsTxt: text("llms_txt"),
  customDomain: text("custom_domain").unique(),
  locale: text("locale").notNull().default("en"),
  domainVerified: boolean("domain_verified").notNull().default(false),
  // Random token the merchant proves ownership with, via a
  // `_shopper-verify.<domain>` TXT record — see src/lib/domain-verification.ts.
  domainVerificationToken: text("domain_verification_token"),

  // SaaS
  plan: planEnum("plan").notNull().default("FREE"),
  poweredByHidden: boolean("powered_by_hidden").notNull().default(false),

  isPublished: boolean("is_published").notNull().default(false),

  // Abandoned-cart follow-up (src/app/dashboard/abandoned-carts) — how many
  // hours a WEBSITE checkout can sit unpaid before it's surfaced to the
  // merchant to nudge the customer on WhatsApp. Configurable per store.
  abandonedCartThresholdHours: integer("abandoned_cart_threshold_hours").notNull().default(2),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Links a user to a store with a role. A user can belong to many stores
// (e.g. an agency staff member managing several client stores).
export const storeMembers = pgTable(
  "store_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: storeRoleEnum("role").notNull().default("STAFF"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("store_members_store_user_unique").on(t.storeId, t.userId)]
);

// A pending invitation to join a store's team, sent to an email address
// that may or may not already have a Shopper account (see
// src/modules/stores/services/staff-service.ts and src/app/invite/[token]).
// Not unique on (storeId, email) — re-inviting the same address replaces
// the prior pending row rather than fighting a constraint.
export const storeInvites = pgTable("store_invites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: storeRoleEnum("role").notNull().default("STAFF"),
  tokenHash: text("token_hash").notNull().unique(),
  invitedByUserId: text("invited_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
