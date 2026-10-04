import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import {
  toggleDiscountStatus,
  deleteDiscount,
  DiscountServiceError,
} from "@/modules/discounts/services/discount-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const { id: discountId } = await params;
    const body = await request.json();

    const updated = await toggleDiscountStatus(store.id, discountId, body.isActive);
    return NextResponse.json({ discount: updated });
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
    return NextResponse.json({ error: "Failed to update discount" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const { id: discountId } = await params;

    const deleted = await deleteDiscount(store.id, discountId);
    return NextResponse.json({ discount: deleted });
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
    return NextResponse.json({ error: "Failed to delete discount" }, { status: 500 });
  }
}
