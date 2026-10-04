import "server-only";

// PayDunya serves the West African CFA Franc (XOF) zone -- Benin, Senegal,
// Togo, Cote d'Ivoire, etc -- as opposed to Paystack, which is Nigeria/NGN
// focused. A store picks whichever provider(s) fit its own market via the
// dashboard; this adapter doesn't assume or enforce a currency itself.
//
// Reference: https://developers.paydunya.com/doc/EN/http_json

export interface PaydunyaInitializeOptions {
  masterKey: string;
  privateKey: string;
  token: string;
  sandbox?: boolean;
  amount: number; // standard currency units, e.g. 5000 XOF
  description: string;
  storeName: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  returnUrl: string;
  cancelUrl: string;
  callbackUrl: string;
  customData?: Record<string, unknown>;
}

export interface PaydunyaConfirmResult {
  responseCode: string;
  status: "completed" | "pending" | "cancelled" | "failed" | string;
  responseText?: string;
  raw: Record<string, unknown>;
}

function paydunyaBaseUrl(sandbox?: boolean) {
  return sandbox
    ? "https://app.paydunya.com/sandbox-api/v1"
    : "https://app.paydunya.com/api/v1";
}

function paydunyaHeaders(masterKey: string, privateKey: string, token: string) {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": masterKey,
    "PAYDUNYA-PRIVATE-KEY": privateKey,
    "PAYDUNYA-TOKEN": token,
  };
}

/**
 * Creates a PayDunya checkout invoice and returns the hosted checkout URL to
 * redirect the customer to, plus the invoice token we store as our own
 * transaction reference for later confirmation.
 */
export async function initializePaydunyaTransaction(options: PaydunyaInitializeOptions) {
  const res = await fetch(`${paydunyaBaseUrl(options.sandbox)}/checkout-invoice/create`, {
    method: "POST",
    headers: paydunyaHeaders(options.masterKey, options.privateKey, options.token),
    body: JSON.stringify({
      invoice: {
        total_amount: Math.round(options.amount),
        description: options.description,
      },
      store: { name: options.storeName },
      actions: {
        callback_url: options.callbackUrl,
        return_url: options.returnUrl,
        cancel_url: options.cancelUrl,
      },
      custom_data: options.customData,
    }),
  });

  const data = await res.json();
  // PayDunya's own convention: "00" means success. The checkout URL comes
  // back in `response_text`, not a field named `url` -- easy to mix up.
  if (data.response_code !== "00") {
    throw new Error(data.response_text || data.description || "Failed to initialize PayDunya payment");
  }

  return {
    checkoutUrl: data.response_text as string,
    invoiceToken: data.token as string,
  };
}

/**
 * Confirms a PayDunya invoice directly against PayDunya's own API using our
 * own stored keys. Always the source of truth -- never trust a redirect
 * query string or an IPN payload's own claimed status (same rule the
 * Paystack adapter follows).
 */
export async function confirmPaydunyaTransaction(
  masterKey: string,
  privateKey: string,
  token: string,
  invoiceToken: string,
  sandbox?: boolean
): Promise<PaydunyaConfirmResult> {
  const res = await fetch(
    `${paydunyaBaseUrl(sandbox)}/checkout-invoice/confirm/${invoiceToken}`,
    {
      method: "GET",
      headers: paydunyaHeaders(masterKey, privateKey, token),
    }
  );

  const data = await res.json();
  return {
    responseCode: data.response_code,
    status: data.status,
    responseText: data.response_text,
    raw: data,
  };
}
