import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPayments } from "@/db/schema";
import { getCurrentStore, TenantError } from "@/lib/tenant";
import {
  confirmPlanPayment,
  SubscriptionServiceError,
} from "@/modules/subscriptions/services/subscription-service";

/** Called by the billing page when Paystack sends the owner back. */
export async function POST(request: Request) {
  try {
    const { store } = await getCurrentStore();
    const { reference } = await request.json().catch(() => ({}));
    if (typeof reference !== "string" || !reference) {
      return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });
    }

    // Only ever confirm a payment that belongs to the caller's own store.
    const [owned] = await db
      .select({ id: subscriptionPayments.id })
      .from(subscriptionPayments)
      .where(and(eq(subscriptionPayments.reference, reference), eq(subscriptionPayments.storeId, store.id)))
      .limit(1);
    if (!owned) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const result = await confirmPlanPayment(reference);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof SubscriptionServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("plan payment verify failed", error);
    return NextResponse.json({ error: "Couldn't confirm the payment yet." }, { status: 500 });
  }
}
