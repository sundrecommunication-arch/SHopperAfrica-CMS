import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  date,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { stores } from "./tenant";

// --- Ad platform integrations ------------------------------------------------
//
// Every merchant can connect their own Google Ads / Meta (Facebook & Instagram)
// / TikTok Ads account so its performance shows up alongside their Shopper
// sales data (see src/app/dashboard/ad-performance). Shopper itself is the ONE
// OAuth app registered with each platform (client id/secret in env vars — see
// .env.example); each merchant's "Connect" click authorizes THAT app to read
// their own account, which is the standard multi-tenant OAuth pattern.

export const adPlatformEnum = pgEnum("ad_platform", ["GOOGLE_ADS", "META", "TIKTOK"]);

export const adConnectionStatusEnum = pgEnum("ad_connection_status", [
  "CONNECTED",
  "NEEDS_REAUTH", // refresh failed / token revoked — merchant needs to reconnect
  "ERROR", // last sync attempt failed (rate limit, permission, etc.) — see lastError
  "DISCONNECTED",
]);

// One row per store per platform (v1: one ad account per platform per store).
// accessToken/refreshToken are ALWAYS encrypted before being written here —
// never insert raw OAuth tokens directly. See src/lib/crypto.ts.
export const adAccountConnections = pgTable(
  "ad_account_connections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    platform: adPlatformEnum("platform").notNull(),

    externalAccountId: text("external_account_id").notNull(), // e.g. Google Ads customer id, Meta act_id, TikTok advertiser_id
    accountName: text("account_name"),
    currency: text("currency"),

    // AES-256-GCM encrypted (iv + ciphertext + authTag, base64) — see src/lib/crypto.ts.
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted"), // some platforms issue long-lived tokens instead
    tokenExpiresAt: timestamp("token_expires_at"),

    status: adConnectionStatusEnum("status").notNull().default("CONNECTED"),
    lastError: text("last_error"),
    lastSyncedAt: timestamp("last_synced_at"),

    connectedByUserId: text("connected_by_user_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("ad_account_connections_store_platform_unique").on(t.storeId, t.platform)]
).enableRLS();

// Daily performance snapshot per connection — synced on a schedule (see
// src/tasks/syncAdMetrics.ts) rather than queried live on every dashboard
// load, so the dashboard stays fast and doesn't hammer each platform's API.
export const adMetricsDaily = pgTable(
  "ad_metrics_daily",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    connectionId: text("connection_id")
      .notNull()
      .references(() => adAccountConnections.id, { onDelete: "cascade" }),
    date: date("date").notNull(),

    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    spend: numeric("spend", { precision: 12, scale: 2 }).notNull().default("0"),
    conversions: integer("conversions").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("ad_metrics_daily_connection_date_unique").on(t.connectionId, t.date)]
).enableRLS();
