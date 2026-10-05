import { NextResponse, after } from "next/server";
import { getCurrentStore } from "@/lib/tenant";
import { getPublicOrigin } from "@/lib/request-origin";
import { notifyOrderStatusChanged } from "@/modules/notifications/services/order-notifications";
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

    const { order, changes } = await updateOrderStatus(store.id, orderId, body);

    if (changes.fulfillmentStatus || changes.paymentStatus) {
      const origin = getPublicOrigin(request);
      after(() => notifyOrderStatusChanged(order.id, origin, changes));
    }

    return NextResponse.json({ order });
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
