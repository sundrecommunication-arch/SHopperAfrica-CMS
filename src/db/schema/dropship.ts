import { pgTable, text, timestamp, boolean, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { stores } from "./tenant";

// Dropshipping (supplier network). Local wholesalers apply to become
// suppliers, list products at a wholesale price that includes delivery to
// the customer, and merchants add those products to their own stores.
// Customer payments for supplier items are split automatically by Paystack
// (Shopper's platform account): supplier gets the wholesale price, the
// merchant gets the rest. See src/modules/dropship.

export const supplierStatusEnum = pgEnum("supplier_status", ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]);

export const suppliers = pgTable("suppliers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // The Shopper login that runs this supplier account.
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull(),
  phone: text("phone").notNull(), // WhatsApp-reachable, shown to merchants & used for order alerts
  email: text("email").notNull(),
  state: text("state").notNull(), // where they ship from, e.g. "Lagos"
  address: text("address"),
  description: text("description"), // what they sell
  deliveryAreas: text("delivery_areas").notNull().default("Nationwide"),
  deliveryDays: text("delivery_days").notNull().default("2-5 days"),
  status: supplierStatusEnum("status").notNull().default("PENDING"),
  statusNote: text("status_note"), // reason shown to the supplier when rejected/suspended
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

export const supplierProducts = pgTable("supplier_products", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  images: text("images").array().notNull().default([]),
  category: text("category"),
  // What the merchant pays per unit, INCLUDING delivery to their customer.
  wholesalePrice: numeric("wholesale_price", { precision: 12, scale: 2 }).notNull(),
  suggestedPrice: numeric("suggested_price", { precision: 12, scale: 2 }),
  stock: integer("stock").notNull().default(0),
  sku: text("sku"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

// Bank account a supplier or a dropshipping store is paid into, registered
// as a Paystack subaccount on Shopper's platform account so split payments
// can send money there. Exactly one of storeId / supplierId is set.
export const payoutAccounts = pgTable("payout_accounts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id")
    .unique()
    .references(() => stores.id, { onDelete: "cascade" }),
  supplierId: text("supplier_id")
    .unique()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  bankCode: text("bank_code").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumberLast4: text("account_number_last4").notNull(),
  accountName: text("account_name").notNull(), // as verified by the bank
  subaccountCode: text("subaccount_code").notNull(), // Paystack ACCT_xxx
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();
