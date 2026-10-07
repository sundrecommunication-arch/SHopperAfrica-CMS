import { pgTable, text, timestamp, primaryKey, integer, jsonb } from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "@auth/core/adapters";

// Core user account. A user can own/belong to multiple stores (see storeMembers).
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // null when the user only uses an OAuth provider
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  // Marketing source at signup (utm_source etc.) -- see src/lib/attribution.ts.
  signupAttribution: jsonb("signup_attribution").$type<Record<string, string>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

// Auth.js (NextAuth) required tables — enables future OAuth providers without rework.
export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
).enableRLS();

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}).enableRLS();

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
).enableRLS();

// Forgot-password flow. Deliberately separate from verificationTokens (Auth.js's own
// table, keyed by identifier+token) rather than reused — this one is keyed by userId,
// carries a usedAt marker so a token can't be replayed after a successful reset, and
// stores only a SHA-256 hash of the token (see password-reset-service.ts) so a DB leak
// alone can't be used to reset anyone's password.
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  usedAt: timestamp("used_at", { mode: "date" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();
