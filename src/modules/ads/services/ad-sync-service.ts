import "server-only";

import { getAdapter, type AdPlatform, type DailyMetric } from "@/lib/ad-platforms";
import type { adAccountConnections } from "@/db/schema";
import {
  decryptConnectionTokens,
  markConnectionError,
  markConnectionNeedsReauth,
  replaceDailyMetrics,
  updateConnectionTokens,
} from "./ad-connections-service";

type Connection = typeof adAccountConnections.$inferSelect;

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Pulls the last `days` of metrics for one connection and stores them,
 * refreshing the access token once if the first attempt looks like an auth
 * failure. Used by both the "Refresh now" button
 * (src/app/api/integrations/[platform]/sync/route.ts) and the scheduled sync
 * (src/tasks/syncAdMetrics.ts) so the retry/error-classification logic only
 * lives in one place.
 */
export async function syncConnection(
  connection: Connection,
  days = 30
): Promise<{ ok: true; days: number } | { ok: false; error: string }> {
  const adapter = getAdapter(connection.platform as AdPlatform);
  let tokens = decryptConnectionTokens(connection);

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  const range = { from: toDateStr(from), to: toDateStr(to) };

  try {
    let metrics: DailyMetric[];
    try {
      metrics = await adapter.fetchDailyMetrics(tokens, connection.externalAccountId, range);
    } catch (firstError) {
      if (!tokens.refreshToken) throw firstError;
      // Could be an expired access token — try one refresh-and-retry before
      // giving up. If the refresh itself fails, that error propagates as-is.
      tokens = await adapter.refreshTokens(tokens.refreshToken);
      await updateConnectionTokens(connection.id, tokens);
      metrics = await adapter.fetchDailyMetrics(tokens, connection.externalAccountId, range);
    }

    await replaceDailyMetrics(connection.id, metrics);
    return { ok: true, days };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // Heuristic: token/permission-shaped failures mean the merchant needs to
    // reconnect; anything else (rate limit, transient 5xx, ...) is just a
    // failed sync attempt that can retry next time.
    if (/invalid_grant|expired|revoked|invalid.?token|unauthorized|401|403/i.test(message)) {
      await markConnectionNeedsReauth(connection.id);
    } else {
      await markConnectionError(connection.id, message);
    }
    return { ok: false, error: message };
  }
}
