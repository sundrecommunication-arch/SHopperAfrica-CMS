import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import {
  listDeliveryOptions,
  createDeliveryOption,
  ShippingServiceError,
} from "@/modules/shipping/services/shipping-service";

export async function GET() {
  try {
    const { store } = await getCurrentStore();
    const options = await listDeliveryOptions(store.id);
    return NextResponse.json({ options });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load delivery options" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const body = await request.json();

    const option = await createDeliveryOption(store.id, body);
    return NextResponse.json({ option });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ShippingServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create delivery option" }, { status: 500 });
  }
}
