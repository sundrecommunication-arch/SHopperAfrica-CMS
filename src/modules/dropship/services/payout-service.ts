import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { payoutAccounts } from "@/db/schema";
import {
  createPaystackSubaccount,
  listPaystackBanks,
  resolvePaystackAccount,
  type PaystackBank,
} from "@/modules/payments/adapters/paystack-adapter";
import { getPlatformPaystackKey } from "@/modules/subscriptions/services/subscription-service";
import { payoutAccountSchema } from "../validation/schemas";

export class PayoutServiceError extends Error {}

function platformKey() {
  const key = getPlatformPaystackKey();
  if (!key) throw new PayoutServiceError("Payouts aren't switched on yet. Please contact Shopper support.");
  return key;
}

let bankCache: { at: number; banks: PaystackBank[] } | null = null;

export async function listBanks(): Promise<PaystackBank[]> {
  if (bankCache && Date.now() - bankCache.at < 24 * 60 * 60 * 1000) return bankCache.banks;
  const banks = await listPaystackBanks(platformKey());
  bankCache = { at: Date.now(), banks };
  return banks;
}

/** Returns the account holder's name for the confirm step ("Is this you? ADUNNI BAKARE"). */
export async function lookUpAccount(input: unknown) {
  const parsed = payoutAccountSchema.safeParse(input);
  if (!parsed.success) throw new PayoutServiceError(parsed.error.issues[0]?.message ?? "Check the account details");
  try {
    return await resolvePaystackAccount(platformKey(), parsed.data.accountNumber, parsed.data.bankCode);
  } catch (error) {
    if (error instanceof PayoutServiceError) throw error;
    throw new PayoutServiceError("We couldn't find that account. Check the number and bank, then try again.");
  }
}

type Owner = { storeId: string } | { supplierId: string };

export async function getPayoutAccount(owner: Owner) {
  const [row] = await db
    .select()
    .from(payoutAccounts)
    .where("storeId" in owner ? eq(payoutAccounts.storeId, owner.storeId) : eq(payoutAccounts.supplierId, owner.supplierId))
    .limit(1);
  return row ?? null;
}

/**
 * Verifies the account with the bank, registers it as a Paystack subaccount
 * of Shopper's platform account (what split payments pay into), and saves
 * it. Replaces any previous account for the same owner. The full account
 * number goes to Paystack only; we keep the last 4 digits for display.
 */
export async function savePayoutAccount(owner: Owner, input: unknown, label: { businessName: string; email?: string }) {
  const parsed = payoutAccountSchema.safeParse(input);
  if (!parsed.success) throw new PayoutServiceError(parsed.error.issues[0]?.message ?? "Check the account details");
  const { bankCode, accountNumber } = parsed.data;

  const { accountName } = await lookUpAccount(parsed.data);
  const bankName = (await listBanks()).find((b) => b.code === bankCode)?.name ?? bankCode;

  let subaccountCode: string;
  try {
    ({ subaccountCode } = await createPaystackSubaccount(platformKey(), {
      businessName: label.businessName.slice(0, 100),
      bankCode,
      accountNumber,
      email: label.email,
    }));
  } catch (error) {
    throw new PayoutServiceError(error instanceof Error ? error.message : "Could not save the bank account");
  }

  const values = {
    bankCode,
    bankName,
    accountNumberLast4: accountNumber.slice(-4),
    accountName,
    subaccountCode,
    updatedAt: new Date(),
  };
  const existing = await getPayoutAccount(owner);
  if (existing) {
    await db.update(payoutAccounts).set(values).where(eq(payoutAccounts.id, existing.id));
  } else {
    await db.insert(payoutAccounts).values({ ...owner, ...values });
  }
  return { bankName, accountName, accountNumberLast4: values.accountNumberLast4 };
}
