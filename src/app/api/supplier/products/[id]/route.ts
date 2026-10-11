import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/current-user";
import {
  deleteSupplierProduct,
  requireSupplier,
  updateSupplierProduct,
} from "@/modules/dropship/services/supplier-service";
import { supplierErrorResponse } from "../../_shared";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const supplier = await requireSupplier(await requireUserId(), { approved: true });
    const { id } = await params;
    const product = await updateSupplierProduct(supplier.id, id, await request.json().catch(() => null));
    return NextResponse.json({ product });
  } catch (error) {
    return supplierErrorResponse(error, "supplier product update failed");
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const supplier = await requireSupplier(await requireUserId(), { approved: true });
    const { id } = await params;
    return NextResponse.json(await deleteSupplierProduct(supplier.id, id));
  } catch (error) {
    return supplierErrorResponse(error, "supplier product delete failed");
  }
}
