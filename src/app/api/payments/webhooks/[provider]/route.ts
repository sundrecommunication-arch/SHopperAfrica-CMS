import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { orders, payments, paymentProviders } from "@/db/schema";

/**
 * Verifies that a webhook payload was actually signed by Paystack using the
 * store's own secret key, per Paystack's documented HMAC-SHA512 scheme.
 * Without this check, anyone who knows (or guesses) an order reference could
 * POST a fake "charge.success" event here and mark any order PAID for free.
 */
function isValidPaystackSignature(rawBody: string, signature: string | null, secretKey: string) {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const bodyText = await request.text();
    const event = JSON.parse(bodyText);

    if (provider === "paystack") {
      // Paystack webhook event
      if (event.event === "charge.success") {
        const reference = event.data?.reference as string;
        const metadata = event.data?.metadata;
        const orderId = metadata?.orderId as string | undefined;

        if (reference) {
          // Find payment record by transaction reference or orderId
          const paymentRows = orderId
            ? await db.select().from(payments).where(eq(payments.orderId, orderId)).limit(1)
            : await db
                .select()
                .from(payments)
                .where(eq(payments.transactionReference, reference))
                .limit(1);

          const paymentRecord = paymentRows[0];
          if (paymentRecord) {
            // Resolve the store's own Paystack secret key (same lookup the
            // initialize/verify routes use) so we check the signature
            // against the key that actually signed this specific event.
            const [providerConfig] = await db
              .select()
              .from(paymentProviders)
              .where(
                and(
                  eq(paymentProviders.storeId, paymentRecord.storeId),
                  eq(paymentProviders.type, "PAYSTACK"),
                  eq(paymentProviders.isEnabled, true)
                )
              )
              .limit(1);

            const secretKey =
              (providerConfig?.config?.secretKey as string) || process.env.PAYSTACK_SECRET_KEY;

            const signature = request.headers.get("x-paystack-signature");

            if (!secretKey || !isValidPaystackSignature(bodyText, signature, secretKey)) {
              console.error("Paystack webhook: signature verification failed", {
                orderId: paymentRecord.orderId,
                hasSecretKey: !!secretKey,
                hasSignatureHeader: !!signature,
              });
              return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
            }

            await db.transaction(async (tx) => {
              await tx
                .update(orders)
                .set({ paymentStatus: "PAID", updatedAt: new Date() })
                .where(eq(orders.id, paymentRecord.orderId));

              await tx
                .update(payments)
                .set({
                  status: "SUCCEEDED",
                  transactionReference: reference,
                  rawPayload: event.data,
                  updatedAt: new Date(),
                })
                .where(eq(payments.id, paymentRecord.id));
            });
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
