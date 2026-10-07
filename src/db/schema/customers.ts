import { pgTable, text, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { stores } from "./tenant";

// Customers are created automatically on first order — guest checkout is
// always supported (docs section 24). No login required for shoppers in V1.
export const customers = pgTable(
  "customers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    notes: text("notes"),
    // Customer-facing storefront accounts (separate from the merchant/staff
    // `users` table and its NextAuth sessions) -- null means this is still
    // just a guest-checkout record with no password set. Signing up with the
    // same phone number this row already has "claims" it in place (see
    // src/modules/customer-auth), so past guest orders show up automatically.
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("customers_store_phone_unique").on(t.storeId, t.phone)]
).enableRLS();

// One row per active customer login session (mirrors the shape of Auth.js's
// own `sessions` table for merchant/staff users) -- a storefront customer's
// session cookie is scoped per store (see customer-auth-service.ts), so this
// table just needs the token, who it belongs to, and when it expires.
export const customerSessions = pgTable("customer_sessions", {
  sessionToken: text("session_token").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}).enableRLS();

export const addresses = pgTable("addresses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  label: text("label"),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state"),
  country: text("country").notNull().default("Nigeria"),
  postalCode: text("postal_code"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();
