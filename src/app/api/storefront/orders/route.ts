import { NextResponse, after } from "next/server";
import { getPublicOrigin } from "@/lib/request-origin";
import { notifyOrderPlaced } from "@/modules/notifications/services/order-notifications";
import {
  createStorefrontOrder,
  OrderServiceError,
} from "@/modules/orders/services/order-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createStorefrontOrder(body);

    // Online-payment orders aren't real until paid -- their emails go out
    // from the payment verify/webhook routes instead, once confirmed.
    if (body.paymentMethodType !== "PAYSTACK" && body.paymentMethodType !== "PAYDUNYA") {
      const origin = getPublicOrigin(request);
      after(() => notifyOrderPlaced(result.orderId, origin));
    }

    return NextResponse.json({
      success: true,
      order: result,
      receiptUrl: `/store/${body.storeSlug}/orders/${result.orderNumber}`,
    });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Order placement error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while placing your order." },
      { status: 500 }
    );
  }
}
