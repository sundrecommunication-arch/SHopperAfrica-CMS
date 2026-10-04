import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import {
  listStoreDiscounts,
  createDiscount,
  DiscountServiceError,
} from "@/modules/discounts/services/discount-service";

export async function GET() {
  try {
    const { store } = await getCurrentStore();
    const discountList = await listStoreDiscounts(store.id);
    return NextResponse.json({ discounts: discountList });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load discounts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const body = await request.json();

    const discount = await createDiscount(store.id, body);
    return NextResponse.json({ discount });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof DiscountServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create discount" }, { status: 500 });
  }
}
