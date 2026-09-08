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
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("customers_store_phone_unique").on(t.storeId, t.phone)]
);

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
});
