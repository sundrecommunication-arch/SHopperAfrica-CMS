import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { verifyDomainOwnership } from "@/lib/domain-verification";

/**
 * Checks pending custom domains and updates verification status. Meant to
 * be run on a schedule (cron/scheduled task) so a domain flips to verified
 * automatically once the merchant adds the DNS TXT record — the same check
 * the "Verify domain" button in the dashboard (src/app/api/stores/domain/verify)
 * runs on demand.
 */
export async function verifyPendingDomains() {
  const pendingStores = await db
    .select()
    .from(stores)
    .where(and(eq(stores.domainVerified, false), isNotNull(stores.customDomain)));

  for (const store of pendingStores) {
    if (!store.customDomain || !store.domainVerificationToken) continue;
    try {
      const verified = await verifyDomainOwnership(store.customDomain, store.domainVerificationToken);
      if (verified) {
        await db
          .update(stores)
          .set({ domainVerified: true, updatedAt: new Date() })
          .where(eq(stores.id, store.id));
        console.log(`Domain ${store.customDomain} verified for store ${store.id}`);
      }
    } catch (err) {
      console.error(`Error checking domain ${store.customDomain}:`, err);
    }
  }
}

if (require.main === module) {
  verifyPendingDomains()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
