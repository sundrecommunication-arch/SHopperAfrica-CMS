import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import {
  listStorePaymentProviders,
  upsertPaymentProvider,
  PaymentServiceError,
} from "@/modules/payments/services/payment-service";

// Payment provider config holds live secret keys (Paystack secret key,
// PayDunya master/private keys) -- restricted to OWNER/MANAGER, same as
// every other sensitive store-config endpoint. STAFF never sees these.
export async function GET() {
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const providers = await listStorePaymentProviders(store.id);
    return NextResponse.json({ providers });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load payment providers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const body = await request.json();

    const provider = await upsertPaymentProvider(store.id, body);
    return NextResponse.json({ provider });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof PaymentServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update payment provider" }, { status: 500 });
  }
}
