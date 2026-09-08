import "server-only";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { storeMembers, stores } from "@/db/schema";
import type { StoreRole } from "@/types/next-auth";

export class TenantError extends Error {}

/**
 * Resolves the store the current signed-in user is acting on, verifying
 * membership server-side. This is the ONLY sanctioned way to get a "current
 * store" in server code — never trust a storeId passed from the client
 * without running it through this check (docs section 38/39).
 *
 * Every data-access function for tenant-owned tables should take the
 * storeId from here, not from a request body or query param.
 */
export async function getCurrentStore(requestedStoreId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new TenantError("Not authenticated");
  }

  const storeId = requestedStoreId ?? session.activeStoreId ?? undefined;
  if (!storeId) {
    throw new TenantError("No store selected");
  }

  const [membership] = await db
    .select({ role: storeMembers.role })
    .from(storeMembers)
    .where(and(eq(storeMembers.storeId, storeId), eq(storeMembers.userId, session.user.id)))
    .limit(1);

  if (!membership) {
    throw new TenantError("You do not have access to this store");
  }

  const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!store) {
    throw new TenantError("Store not found");
  }

  return { store, role: membership.role as StoreRole, userId: session.user.id };
}

/** Throws unless the caller's role is in `allowed`. Use inside mutations. */
export function requireRole(role: StoreRole, allowed: StoreRole[]) {
  if (!allowed.includes(role)) {
    throw new TenantError(`This action requires one of: ${allowed.join(", ")}`);
  }
}
