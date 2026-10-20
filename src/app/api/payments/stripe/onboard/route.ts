import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { getPublicOrigin } from "@/lib/request-origin";
import { getOnboardingUrl, StripeConnectError } from "@/modules/payments/services/stripe-connect-service";

/**
 * Sends the merchant to Stripe's onboarding. A GET (a link, not a form) so it
 * can double as Stripe's refresh_url: onboarding links are single-use, and
 * Stripe sends the merchant here for a fresh one when theirs has expired.
 */
export async function GET(request: Request) {
  const origin = getPublicOrigin(request);
  const back = (error: string) =>
    NextResponse.redirect(`${origin}/dashboard/payments?stripe_error=${encodeURIComponent(error)}`, 303);
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const session = await auth();
    const url = await getOnboardingUrl(store.id, session?.user?.email ?? null, origin);
    return NextResponse.redirect(url, 303);
  } catch (error) {
    if (error instanceof TenantError) return NextResponse.redirect(`${origin}/login`, 303);
    if (error instanceof StripeConnectError) return back(error.message);
    console.error("stripe onboarding failed", error);
    return back("Couldn't reach Stripe. Please try again in a moment.");
  }
}
