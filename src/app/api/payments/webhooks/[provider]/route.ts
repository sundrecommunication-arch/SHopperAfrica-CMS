import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { orders, payments } from "@/db/schema";

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
