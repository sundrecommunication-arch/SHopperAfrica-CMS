import "server-only";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { paymentProviders } from "@/db/schema";
import { assertFeature, getStorePlan, SubscriptionServiceError } from "@/modules/subscriptions/services/subscription-service";
import {
  savePaymentProviderSchema,
  type SavePaymentProviderInput,
} from "../validation/schemas";

export class PaymentServiceError extends Error {}

const ONLINE_TYPES: string[] = ["PAYSTACK", "PAYDUNYA"];

/**
 * Lists all payment providers configured for a merchant's store.
 */
export async function listStorePaymentProviders(storeId: string) {
  return db
    .select()
    .from(paymentProviders)
    .where(eq(paymentProviders.storeId, storeId));
}

/**
 * Upserts a payment provider (e.g. Bank Transfer, Cash on Delivery, WhatsApp).
 */
export async function upsertPaymentProvider(
  storeId: string,
  input: SavePaymentProviderInput
) {
  const parsed = savePaymentProviderSchema.safeParse(input);
  if (!parsed.success) {
    throw new PaymentServiceError(
      parsed.error.issues[0]?.message ?? "Invalid payment provider settings"
    );
  }

  const { type, label, isEnabled, config } = parsed.data;

  if (isEnabled && ONLINE_TYPES.includes(type)) {
    try {
      await assertFeature(storeId, "onlinePayments");
    } catch (error) {
      if (error instanceof SubscriptionServiceError) throw new PaymentServiceError(error.message);
      throw error;
    }
  }

  // Check if provider for this type already exists for this store
  const [existing] = await db
    .select({ id: paymentProviders.id })
    .from(paymentProviders)
    .where(
      and(
        eq(paymentProviders.storeId, storeId),
        eq(paymentProviders.type, type)
      )
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(paymentProviders)
      .set({
        label,
        isEnabled,
        config,
        updatedAt: new Date(),
      })
      .where(eq(paymentProviders.id, existing.id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(paymentProviders)
    .values({
      storeId,
      type,
      label,
      isEnabled,
      config,
    })
    .returning();

  return inserted;
}

/**
 * Lists enabled payment providers for a customer visiting the storefront.
 */
export async function getPublicStorePaymentProviders(storeId: string) {
  // A store whose plan lapsed keeps its saved keys, but card payments stop
  // being offered until it's on a paid plan again.
  const [{ limits }, rows] = await Promise.all([
    getStorePlan(storeId),
    db
      .select({
        id: paymentProviders.id,
        type: paymentProviders.type,
        label: paymentProviders.label,
        config: paymentProviders.config,
      })
      .from(paymentProviders)
      .where(and(eq(paymentProviders.storeId, storeId), eq(paymentProviders.isEnabled, true))),
  ]);
  const allowed = limits.onlinePayments ? rows : rows.filter((p) => !ONLINE_TYPES.includes(p.type));
  // This goes to the customer's browser: only bank-transfer details are
  // meant to be public. Online providers' config holds secret API keys.
  return allowed.map((p) => ({ ...p, config: p.type === "MANUAL" ? p.config : {} }));
}
