import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/current-user";
import { applyAsSupplier } from "@/modules/dropship/services/supplier-service";
import { supplierErrorResponse } from "../_shared";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const supplier = await applyAsSupplier(userId, await request.json().catch(() => null));
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    return supplierErrorResponse(error, "supplier apply failed");
  }
}
