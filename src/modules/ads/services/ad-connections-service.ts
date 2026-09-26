import "server-only";
import { and, asc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db";
import { adAccountConnections, adMetricsDaily } from "@/db/schema";
import { decryptToken, encryptToken } from "@/lib/crypto";
import type { AdAccountInfo, AdPlatform, DailyMetric, OAuthTokens } from "@/lib/ad-platforms";

export class AdConnectionsServiceError extends Error {}

export async function listConnections(storeId: string) {
  return db
    .select()
    .from(adAccountConnections)
    .where(eq(adAccountConnections.storeId, storeId));
}

export async function getConnection(storeId: string, platform: AdPlatform) {
  const [row] = await db
    .select()
    .from(adAccountConnections)
    .where(and(eq(adAccountConnections.storeId, storeId), eq(adAccountConnections.platform, platform)))
    .limit(1);
  return row ?? null;
}

/** Decrypts the stored tokens for a connection — never pass the raw DB row's encrypted fields around directly. */
export function decryptConnectionTokens(connection: {
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  tokenExpiresAt: Date | null;
}): OAuthTokens {
  return {
    accessToken: decryptToken(connection.accessTokenEncrypted),
    refreshToken: connection.refreshTokenEncrypted ? decryptToken(connection.refreshTokenEncrypted) : null,
    expiresAt: connection.tokenExpiresAt,
  };
}

/** Creates or replaces the connection for (storeId, platform) — a fresh "Connect" always overwrites the old tokens. */
export async function upsertConnection(
  storeId: string,
  platform: AdPlatform,
  tokens: OAuthTokens,
  account: AdAccountInfo,
  connectedByUserId: string
) {
  const existing = await getConnection(storeId, platform);
  const values = {
    storeId,
    platform,
    externalAccountId: account.externalAccountId,
    accountName: account.accountName,
    currency: account.currency,
    accessTokenEncrypted: encryptToken(tokens.accessToken),
    refreshTokenEncrypted: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
    tokenExpiresAt: tokens.expiresAt,
    status: "CONNECTED" as const,
    lastError: null,
    connectedByUserId,
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db
      .update(adAccountConnections)
      .set(values)
      .where(eq(adAccountConnections.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db.insert(adAccountConnections).values(values).returning();
  return created;
}

export async function disconnectConnection(storeId: string, platform: AdPlatform) {
  const [updated] = await db
    .update(adAccountConnections)
    .set({ status: "DISCONNECTED", updatedAt: new Date() })
    .where(and(eq(adAccountConnections.storeId, storeId), eq(adAccountConnections.platform, platform)))
    .returning();
  if (!updated) {
    throw new AdConnectionsServiceError("No connection found for that platform");
  }
  return updated;
}

export async function markConnectionError(connectionId: string, message: string) {
  await db
    .update(adAccountConnections)
    .set({ status: "ERROR", lastError: message, updatedAt: new Date() })
    .where(eq(adAccountConnections.id, connectionId));
}

export async function markConnectionNeedsReauth(connectionId: string) {
  await db
    .update(adAccountConnections)
    .set({ status: "NEEDS_REAUTH", updatedAt: new Date() })
    .where(eq(adAccountConnections.id, connectionId));
}

/** Refreshed tokens after a token-refresh call — keeps status as CONNECTED and clears any prior error. */
export async function updateConnectionTokens(connectionId: string, tokens: OAuthTokens) {
  await db
    .update(adAccountConnections)
    .set({
      accessTokenEncrypted: encryptToken(tokens.accessToken),
      refreshTokenEncrypted: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
      tokenExpiresAt: tokens.expiresAt,
      status: "CONNECTED",
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(adAccountConnections.id, connectionId));
}

export async function replaceDailyMetrics(connectionId: string, metrics: DailyMetric[]) {
  if (metrics.length === 0) return;

  await db.transaction(async (tx) => {
    for (const metric of metrics) {
      await tx
        .insert(adMetricsDaily)
        .values({
          connectionId,
          date: metric.date,
          impressions: metric.impressions,
          clicks: metric.clicks,
          spend: String(metric.spend),
          conversions: metric.conversions,
        })
        .onConflictDoUpdate({
          target: [adMetricsDaily.connectionId, adMetricsDaily.date],
          set: {
            impressions: metric.impressions,
            clicks: metric.clicks,
            spend: String(metric.spend),
            conversions: metric.conversions,
          },
        });
    }

    await tx
      .update(adAccountConnections)
      .set({ lastSyncedAt: new Date() })
      .where(eq(adAccountConnections.id, connectionId));
  });
}

export async function getMetricsForStore(
  storeId: string,
  range: { from: string; to: string }
) {
  const connections = await listConnections(storeId);
  if (connections.length === 0) return [];

  const results = await Promise.all(
    connections.map(async (connection) => {
      const rows = await db
        .select()
        .from(adMetricsDaily)
        .where(
          and(
            eq(adMetricsDaily.connectionId, connection.id),
            gte(adMetricsDaily.date, range.from),
            lte(adMetricsDaily.date, range.to)
          )
        )
        .orderBy(asc(adMetricsDaily.date));
      return { connection, metrics: rows };
    })
  );

  return results;
}
