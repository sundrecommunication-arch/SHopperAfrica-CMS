import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { stores, storeMembers, storeSettings, subscriptions } from "@/db/schema";
import {
  createStoreSchema,
  updateStoreGeneralSchema,
  type CreateStoreInput,
  type UpdateStoreGeneralInput,
} from "../validation/schemas";

export class StoreServiceError extends Error {}

/**
 * Creates a store for a user and makes them its OWNER, in one transaction.
 * This is the whole "quick store creation" flow from docs section 45 —
 * everything downstream (products, orders, settings) hangs off this.
 */
export async function createStoreForUser(userId: string, input: CreateStoreInput) {
  const parsed = createStoreSchema.safeParse(input);
  if (!parsed.success) {
    throw new StoreServiceError(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { name, slug, whatsappNumber } = parsed.data;

  const [existingSlug] = await db.select({ id: stores.id }).from(stores).where(eq(stores.slug, slug)).limit(1);
  if (existingSlug) {
    throw new StoreServiceError("That store URL is already taken");
  }

  return db.transaction(async (tx) => {
    const [store] = await tx
      .insert(stores)
      .values({
        ownerId: userId,
        name,
        slug,
        whatsappNumber: whatsappNumber || null,
        whatsappEnabled: Boolean(whatsappNumber),
      })
      .returning();

    await tx.insert(storeMembers).values({ storeId: store.id, userId, role: "OWNER" });
    await tx.insert(storeSettings).values({ storeId: store.id });
    await tx.insert(subscriptions).values({ storeId: store.id, plan: "FREE" });

    return store;
  });
}

/** Updates a store's general profile fields. Caller must already be authorized (see requireRole). */
export async function updateStoreGeneral(storeId: string, input: UpdateStoreGeneralInput) {
  const parsed = updateStoreGeneralSchema.safeParse(input);
  if (!parsed.success) {
    throw new StoreServiceError(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { name, description, contactEmail, contactPhone, whatsappNumber, whatsappEnabled } = parsed.data;

  const [store] = await db
    .update(stores)
    .set({
      name,
      description: description || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      whatsappNumber: whatsappNumber || null,
      whatsappEnabled,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, storeId))
    .returning();

  return store;
}

export async function listStoresForUser(userId: string) {
  return db
    .select({ store: stores, role: storeMembers.role })
    .from(storeMembers)
    .innerJoin(stores, eq(stores.id, storeMembers.storeId))
    .where(eq(storeMembers.userId, userId));
}
