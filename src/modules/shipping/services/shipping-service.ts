import "server-only";
import { eq, and, asc } from "drizzle-orm";

import { db } from "@/db";
import { shippingZones, shippingRates } from "@/db/schema";
import { deliveryOptionSchema, type DeliveryOptionInput } from "../validation/schemas";
import { calculateDeliveryFee, type DeliveryOption } from "../utils/delivery-fee";

export { calculateDeliveryFee, type DeliveryOption };

export class ShippingServiceError extends Error {}

/**
 * Lists a store's delivery options. Used by both the dashboard and the
 * public checkout — there's nothing secret in a delivery fee.
 */
export async function listDeliveryOptions(storeId: string): Promise<DeliveryOption[]> {
  const rows = await db
    .select({
      id: shippingZones.id,
      name: shippingZones.name,
      amount: shippingRates.amount,
      freeAboveAmount: shippingRates.freeAboveAmount,
    })
    .from(shippingZones)
    .innerJoin(shippingRates, eq(shippingRates.zoneId, shippingZones.id))
    .where(eq(shippingZones.storeId, storeId))
    .orderBy(asc(shippingZones.createdAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: parseFloat(r.amount),
    freeAboveAmount: r.freeAboveAmount ? parseFloat(r.freeAboveAmount) : null,
  }));
}

export async function createDeliveryOption(storeId: string, input: DeliveryOptionInput) {
  const parsed = deliveryOptionSchema.safeParse(input);
  if (!parsed.success) {
    throw new ShippingServiceError(parsed.error.issues[0]?.message ?? "Invalid delivery option");
  }
  const { name, amount, freeAboveAmount } = parsed.data;

  return db.transaction(async (tx) => {
    const [zone] = await tx.insert(shippingZones).values({ storeId, name }).returning();
    await tx.insert(shippingRates).values({
      zoneId: zone.id,
      name,
      amount: String(amount),
      freeAboveAmount: freeAboveAmount ? String(freeAboveAmount) : null,
    });
    return zone;
  });
}

export async function updateDeliveryOption(
  storeId: string,
  optionId: string,
  input: DeliveryOptionInput
) {
  const parsed = deliveryOptionSchema.safeParse(input);
  if (!parsed.success) {
    throw new ShippingServiceError(parsed.error.issues[0]?.message ?? "Invalid delivery option");
  }
  const { name, amount, freeAboveAmount } = parsed.data;

  return db.transaction(async (tx) => {
    const [zone] = await tx
      .update(shippingZones)
      .set({ name })
      .where(and(eq(shippingZones.id, optionId), eq(shippingZones.storeId, storeId)))
      .returning();

    if (!zone) {
      throw new ShippingServiceError("Delivery option not found");
    }

    await tx
      .update(shippingRates)
      .set({
        name,
        amount: String(amount),
        freeAboveAmount: freeAboveAmount ? String(freeAboveAmount) : null,
      })
      .where(eq(shippingRates.zoneId, zone.id));

    return zone;
  });
}

export async function deleteDeliveryOption(storeId: string, optionId: string) {
  // Rates cascade-delete with their zone.
  const [deleted] = await db
    .delete(shippingZones)
    .where(and(eq(shippingZones.id, optionId), eq(shippingZones.storeId, storeId)))
    .returning();

  if (!deleted) {
    throw new ShippingServiceError("Delivery option not found");
  }
  return deleted;
}
