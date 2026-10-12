import { NextResponse } from "next/server";
import { quoteWorldwide } from "@/modules/dropship/global/global-service";
import { worldwideError, worldwideStore } from "../_shared";

/** Full delivered cost in naira (product + shipping to Nigeria) for the "Add to my store" dialog. */
export async function GET(request: Request) {
  try {
    await worldwideStore();
    const pid = new URL(request.url).searchParams.get("pid") ?? "";
    const q = await quoteWorldwide(pid);
    return NextResponse.json({
      name: q.product.name,
      image: q.product.images[0] ?? null,
      options: q.product.variants.length > 1 ? q.product.variants.map((v) => v.name) : [],
      wholesaleNaira: q.wholesaleNaira,
      suggestedNaira: q.suggestedNaira,
      deliveryDays: q.deliveryDays,
    });
  } catch (error) {
    return worldwideError(error);
  }
}
