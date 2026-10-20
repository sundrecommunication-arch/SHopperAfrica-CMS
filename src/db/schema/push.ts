import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";

// Devices that asked for push notifications (the installed Shopper app or a
// browser). One row per browser push subscription; a user can have several
// (phone + laptop). Rows the push service reports as gone are deleted
// (src/modules/notifications/services/push-service.ts).
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
}).enableRLS();
