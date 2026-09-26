import { NextResponse } from "next/server";
import {
  createStorefrontOrder,
  OrderServiceError,
} from "@/modules/orders/services/order-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createStorefrontOrder(body);

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
