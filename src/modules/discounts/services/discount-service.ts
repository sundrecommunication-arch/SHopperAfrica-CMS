import "server-only";
import { eq, and, desc } from "drizzle-orm";

import { db } from "@/db";
import { discounts, stores } from "@/db/schema";
import {
  createDiscountSchema,
  type CreateDiscountInput,
} from "../validation/schemas";

export class DiscountServiceError extends Error {}

/**
 * Lists all discount codes for a merchant's store.
 */
export async function listStoreDiscounts(storeId: string) {
  return db
    .select()
    .from(discounts)
    .where(eq(discounts.storeId, storeId))
    .orderBy(desc(discounts.createdAt));
}

/**
 * Creates a new discount code.
 */
export async function createDiscount(storeId: string, input: CreateDiscountInput) {
  const parsed = createDiscountSchema.safeParse(input);
  if (!parsed.success) {
    throw new DiscountServiceError(
      parsed.error.issues[0]?.message ?? "Invalid discount input"
    );
  }

  const { code, type, value, minOrderAmount, usageLimit, expiresAt, isActive } =
    parsed.data;

  // Check code uniqueness within store
  const [existing] = await db
    .select({ id: discounts.id })
    .from(discounts)
    .where(and(eq(discounts.storeId, storeId), eq(discounts.code, code)))
    .limit(1);

  if (existing) {
    throw new DiscountServiceError("A discount with this code already exists");
  }

  const [created] = await db
    .insert(discounts)
    .values({
      storeId,
      code,
      type,
      value: String(value),
      minOrderAmount: minOrderAmount ? String(minOrderAmount) : null,
      usageLimit: usageLimit || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive,
    })
    .returning();

  return created;
}

/**
 * Toggles or updates active status of a discount.
 */
export async function toggleDiscountStatus(
  storeId: string,
  discountId: string,
  isActive: boolean
) {
  const [updated] = await db
    .update(discounts)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(discounts.id, discountId), eq(discounts.storeId, storeId)))
    .returning();

  if (!updated) {
    throw new DiscountServiceError("Discount not found");
  }

  return updated;
}

/**
 * Deletes a discount.
 */
export async function deleteDiscount(storeId: string, discountId: string) {
  const [deleted] = await db
    .delete(discounts)
    .where(and(eq(discounts.id, discountId), eq(discounts.storeId, storeId)))
    .returning({ id: discounts.id });

  if (!deleted) {
    throw new DiscountServiceError("Discount not found");
  }

  return deleted;
}

/**
 * Validates a discount code for customer checkout and computes discount amount.
 */
export async function validateDiscountCode(
  storeSlug: string,
  code: string,
  subtotal: number
) {
  const [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.slug, storeSlug))
    .limit(1);

  if (!store) {
    throw new DiscountServiceError("Store not found");
  }

  const [discount] = await db
    .select()
    .from(discounts)
    .where(
      and(
        eq(discounts.storeId, store.id),
        eq(discounts.code, code.toUpperCase().trim())
      )
    )
    .limit(1);

  if (!discount) {
    throw new DiscountServiceError("Invalid discount code");
  }

  if (!discount.isActive) {
    throw new DiscountServiceError("This discount code is no longer active");
  }

  if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
    throw new DiscountServiceError("This discount code has expired");
  }

  if (
    discount.usageLimit !== null &&
    discount.usageLimit !== undefined &&
    discount.usageCount >= discount.usageLimit
  ) {
    throw new DiscountServiceError("This discount code has reached its usage limit");
  }

  if (discount.minOrderAmount && subtotal < parseFloat(discount.minOrderAmount)) {
    throw new DiscountServiceError(
      `Minimum order amount for this coupon is ${parseFloat(discount.minOrderAmount).toLocaleString()}`
    );
  }

  // Calculate discount amount
  let discountAmount = 0;
  const numValue = parseFloat(discount.value);

  if (discount.type === "PERCENTAGE") {
    discountAmount = (subtotal * numValue) / 100;
  } else {
    discountAmount = Math.min(numValue, subtotal);
  }

  return {
    id: discount.id,
    code: discount.code,
    type: discount.type,
    value: numValue,
    discountAmount: Math.round(discountAmount * 100) / 100,
  };
}
