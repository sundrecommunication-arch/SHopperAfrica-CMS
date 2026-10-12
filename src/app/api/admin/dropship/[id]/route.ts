import { NextResponse } from "next/server";
import { requirePlatformAdmin, PlatformAdminError } from "@/lib/platform-admin";
import { adminCancelRefundedSupplierOrder, FulfilmentError } from "@/modules/dropship/services/fulfilment-service";
import { getPublicOrigin } from "@/lib/request-origin";

/** After refunding the customer in Paystack: cancel the supplier order (and the order, if nothing is left). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    await adminCancelRefundedSupplierOrder(id, getPublicOrigin(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PlatformAdminError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (error instanceof FulfilmentError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("admin dropship cancel failed", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
