import "server-only";

export interface PaystackInitializeOptions {
  secretKey: string;
  email: string;
  amount: number; // in standard currency units (e.g. 5000 NGN)
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
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
