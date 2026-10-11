import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/current-user";
import { createSupplierProduct, requireSupplier } from "@/modules/dropship/services/supplier-service";
import { supplierErrorResponse } from "../_shared";

export async function POST(request: Request) {
  try {
    const supplier = await requireSupplier(await requireUserId(), { approved: true });
    const product = await createSupplierProduct(supplier.id, await request.json().catch(() => null));
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return supplierErrorResponse(error, "supplier product create failed");
  }
}
