import { NextResponse } from "next/server";
import { getCurrentStore } from "@/lib/tenant";
import {
  updateOrderStatus,
  OrderServiceError,
} from "@/modules/orders/services/order-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { store } = await getCurrentStore();
    const { id: orderId } = await params;
    const body = await request.json();

    const updated = await updateOrderStatus(store.id, orderId, body);
    return NextResponse.json({ order: updated });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
