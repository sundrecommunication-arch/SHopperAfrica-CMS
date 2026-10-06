import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { getPublicOrigin } from "@/lib/request-origin";
import {
  startPlanCheckout,
  SubscriptionServiceError,
} from "@/modules/subscriptions/services/subscription-service";

const checkoutSchema = z.object({ plan: z.enum(["STARTER", "BUSINESS"]) });

/** Owner starts a Paystack payment for one 30-day period of a paid plan. */
export async function POST(request: Request) {
  try {
    const { store, role, userId } = await getCurrentStore();
    requireRole(role, ["OWNER"]);

    const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Choose a plan to upgrade to" }, { status: 400 });
    }

    const session = await auth();
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Your account has no email address" }, { status: 400 });
    }

    const { authorizationUrl } = await startPlanCheckout({
      storeId: store.id,
      plan: parsed.data.plan,
      email,
      userId,
      // Paystack appends ?reference=... when it sends the owner back here.
      callbackUrl: `${getPublicOrigin(request)}/dashboard/billing`,
    });
    return NextResponse.json({ authorizationUrl });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof SubscriptionServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("plan checkout failed", error);
    return NextResponse.json({ error: "Couldn't start the payment. Please try again." }, { status: 500 });
  }
}
