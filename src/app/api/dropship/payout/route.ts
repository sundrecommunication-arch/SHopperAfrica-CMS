import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { savePayoutAccount } from "@/modules/dropship/services/payout-service";
import { supplierErrorResponse } from "@/app/api/supplier/_shared";

/** The store's bank account for dropship earnings. Owner only: it's where the money goes. */
export async function POST(request: Request) {
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER"]);
    const account = await savePayoutAccount({ storeId: store.id }, await request.json().catch(() => null), {
      businessName: store.name,
      email: store.contactEmail ?? undefined,
    });
    return NextResponse.json({ account });
  } catch (error) {
    if (error instanceof TenantError) return NextResponse.json({ error: error.message }, { status: 403 });
    return supplierErrorResponse(error, "store payout save failed");
  }
}
