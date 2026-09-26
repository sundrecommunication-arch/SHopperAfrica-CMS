import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import {
  recordAbandonedCartNudge,
  AbandonedCartServiceError,
} from "@/modules/orders/services/abandoned-cart-service";

/** Logs a merchant's one-click WhatsApp nudge on an abandoned checkout. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { store, role, userId } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER", "STAFF"]);
    const { id: orderId } = await params;

    const nudge = await recordAbandonedCartNudge(store.id, orderId, userId);
    return NextResponse.json({ nudge });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AbandonedCartServiceError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("record abandoned cart nudge failed", error);
    return NextResponse.json({ error: "Failed to record nudge" }, { status: 500 });
  }
}
