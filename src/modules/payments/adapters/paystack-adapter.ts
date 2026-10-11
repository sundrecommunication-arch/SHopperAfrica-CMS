import "server-only";

export interface PaystackInitializeOptions {
  secretKey: string;
  email: string;
  amount: number; // in standard currency units (e.g. 5000 NGN)
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  /**
   * Dynamic multi-split (dropshipping): flat shares in naira per subaccount;
   * whatever's left stays in the main (platform) account. The bearer
   * subaccount pays Paystack's fee.
   */
  split?: { bearerSubaccount: string; shares: { subaccount: string; amount: number }[] };
}

export interface PaystackVerifyResult {
  status: boolean;
  message: string;
  data?: {
    status: string; // "success", "failed", "abandoned"
    reference: string;
    amount: number;
    currency: string;
    paid_at: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Initializes a Paystack transaction and returns checkout URL.
 */
export async function initializePaystackTransaction(options: PaystackInitializeOptions) {
  const amountKobo = Math.round(options.amount * 100);

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: options.email,
      amount: amountKobo,
      reference: options.reference,
      callback_url: options.callbackUrl,
      metadata: options.metadata,
      ...(options.split && {
        split: {
          type: "flat",
          bearer_type: "subaccount",
          bearer_subaccount: options.split.bearerSubaccount,
          subaccounts: options.split.shares.map((s) => ({
            subaccount: s.subaccount,
            share: Math.round(s.amount * 100),
          })),
        },
      }),
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message || "Failed to initialize Paystack payment");
  }

  return {
    authorizationUrl: data.data.authorization_url as string,
    accessCode: data.data.access_code as string,
    reference: data.data.reference as string,
  };
}

/**
 * Verifies a transaction reference on Paystack.
 */
export async function verifyPaystackTransaction(
  secretKey: string,
  reference: string
): Promise<PaystackVerifyResult> {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  return res.json();
}

// --- Banks & subaccounts (dropship payouts) -----------------------------------

async function paystackGet(secretKey: string, path: string) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.status) throw new Error(data.message || "Paystack request failed");
  return data.data;
}

export interface PaystackBank {
  name: string;
  code: string;
}

/** Nigerian banks (incl. OPay, Moniepoint, PalmPay etc.) that can receive payouts. */
export async function listPaystackBanks(secretKey: string): Promise<PaystackBank[]> {
  const banks = (await paystackGet(secretKey, "/bank?country=nigeria&currency=NGN&perPage=200")) as {
    name: string;
    code: string;
    active: boolean;
  }[];
  const seen = new Set<string>();
  return banks
    .filter((b) => b.active && !seen.has(b.code) && seen.add(b.code))
    .map((b) => ({ name: b.name, code: b.code }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Looks up the account holder's name, so people can see they typed the right number. */
export async function resolvePaystackAccount(secretKey: string, accountNumber: string, bankCode: string) {
  const data = await paystackGet(
    secretKey,
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
  );
  return { accountName: data.account_name as string };
}

/** Registers a bank account as a subaccount of the platform account (for split payments). */
export async function createPaystackSubaccount(
  secretKey: string,
  input: { businessName: string; bankCode: string; accountNumber: string; email?: string }
) {
  const res = await fetch("https://api.paystack.co/subaccount", {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      business_name: input.businessName,
      settlement_bank: input.bankCode,
      account_number: input.accountNumber,
      percentage_charge: 0, // unused: every split we send is flat amounts
      primary_contact_email: input.email,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.status) throw new Error(data.message || "Could not register the bank account");
  return { subaccountCode: data.data.subaccount_code as string };
}
