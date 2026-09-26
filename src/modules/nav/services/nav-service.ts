import "server-only";
import { eq, asc } from "drizzle-orm";

import { db } from "@/db";
import { storeNavItems } from "@/db/schema";
import { DEFAULT_NAV_ITEMS } from "../constants";
import { navItemsSchema, type NavItemInput } from "../validation/schemas";

export class NavServiceError extends Error {}

/**
 * Lists nav items for the dashboard editor, in saved order. A store that
 * hasn't customized its nav yet has no rows at all — falls back to the
 * default four-item menu so the editor always has something to show.
 */
export async function listNavItems(storeId: string) {
  const rows = await db
    .select()
    .from(storeNavItems)
    .where(eq(storeNavItems.storeId, storeId))
    .orderBy(asc(storeNavItems.sortOrder));

  if (rows.length === 0) {
    return DEFAULT_NAV_ITEMS.map((item, index) => ({
      id: null as string | null,
      storeId,
      kind: item.kind,
      label: item.label,
      url: item.url,
      isVisible: item.isVisible,
      sortOrder: index,
    }));
  }

  return rows;
}

/**
 * Replaces a store's entire nav configuration in one go. Simpler and safer
 * than diffing individual row changes for a short, fully-reorderable list —
 * every save clears the old rows and writes the new order back in a single
 * transaction, so the menu is never left half-updated.
 */
export async function saveNavItems(storeId: string, items: NavItemInput[]) {
  const parsed = navItemsSchema.safeParse(items);
  if (!parsed.success) {
    throw new NavServiceError(parsed.error.issues[0]?.message ?? "Invalid menu configuration");
  }

  await db.transaction(async (tx) => {
    await tx.delete(storeNavItems).where(eq(storeNavItems.storeId, storeId));
    if (parsed.data.length > 0) {
      await tx.insert(storeNavItems).values(
        parsed.data.map((item, index) => ({
          storeId,
          kind: item.kind,
          label: item.label,
          url: item.kind === "CUSTOM" ? item.url ?? null : null,
          isVisible: item.isVisible,
          sortOrder: index,
        }))
      );
    }
  });

  return listNavItems(storeId);
}
