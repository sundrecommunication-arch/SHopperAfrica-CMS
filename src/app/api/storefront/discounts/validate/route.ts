import { NextResponse } from "next/server";
import {
  validateDiscountCode,
  DiscountServiceError,
} from "@/modules/discounts/services/discount-service";

export async function POST(request: Request) {
  try {
    const { storeSlug, code, subtotal } = await request.json();

    if (!storeSlug || !code || typeof subtotal !== "number") {
      return NextResponse.json(
        { error: "Invalid coupon validation payload" },
        { status: 400 }
      );
    }

    const result = await validateDiscountCode(storeSlug, code, subtotal);
    return NextResponse.json({ success: true, discount: result });
  } catch (error) {
    if (error instanceof DiscountServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to validate discount coupon" },
      { status: 500 }
    );
  }
}
