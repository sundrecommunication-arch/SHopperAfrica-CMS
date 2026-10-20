import { NextResponse } from "next/server";

import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { disconnectStripe } from "@/modules/payments/services/stripe-connect-service";

/** Stops offering card payment at checkout. The merchant keeps their Stripe account. */
export async function POST() {
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    await disconnectStripe(store.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TenantError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }
}
