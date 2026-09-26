import { ne } from "drizzle-orm";
import { db } from "@/db";
import { adAccountConnections } from "@/db/schema";
import { syncConnection } from "@/modules/ads/services/ad-sync-service";

/**
 * Pulls fresh metrics for every connected ad account. Meant to run on a
 * schedule (e.g. once a day) alongside verifyDomains.ts — see that file for
 * how this project wires a task like this into cron/a scheduled task.
 * Skips DISCONNECTED connections; a connection that's already flagged
 * NEEDS_REAUTH or ERROR is still retried here in case the underlying issue
 * (an expired-but-now-refreshed token, a transient rate limit) resolved
 * itself, since syncConnection() re-classifies the outcome each time anyway.
 */
export async function syncAllAdMetrics() {
  const connections = await db
    .select()
    .from(adAccountConnections)
    .where(ne(adAccountConnections.status, "DISCONNECTED"));

  for (const connection of connections) {
    try {
      const result = await syncConnection(connection);
      if (result.ok) {
        console.log(`Synced ${connection.platform} for store ${connection.storeId}`);
      } else {
        console.warn(
          `Ad sync failed for ${connection.platform} / store ${connection.storeId}: ${result.error}`
        );
      }
    } catch (err) {
      console.error(`Unexpected error syncing ${connection.platform} / store ${connection.storeId}`, err);
    }
  }
}

if (require.main === module) {
  syncAllAdMetrics()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
