import { pgTable, text, timestamp, boolean, pgEnum, unique } from "drizzle-orm/pg-core";
import { users } from "./auth";

// --- Enums -----------------------------------------------------------------

export const storeRoleEnum = pgEnum("store_role", ["OWNER", "MANAGER", "STAFF"]);

export const planEnum = pgEnum("plan", ["FREE", "STARTER", "BUSINESS"]);

export const whatsappOrderBehaviorEnum = pgEnum("whatsapp_order_behavior", [
  "SEND_EVERY_ORDER",
  "CUSTOMER_CHOICE",
  "CONTACT_BUTTON_ONLY",
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
  customDomain: text("custom_domain").unique(),

  // SaaS
  plan: planEnum("plan").notNull().default("FREE"),
  poweredByHidden: boolean("powered_by_hidden").notNull().default(false),

  isPublished: boolean("is_published").notNull().default(false),

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
