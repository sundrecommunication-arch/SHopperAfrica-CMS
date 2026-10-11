import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/current-user";
import { requireSupplier } from "@/modules/dropship/services/supplier-service";
import { savePayoutAccount } from "@/modules/dropship/services/payout-service";
import { supplierErrorResponse } from "../_shared";

export async function POST(request: Request) {
  try {
    const supplier = await requireSupplier(await requireUserId(), { approved: true });
    const account = await savePayoutAccount({ supplierId: supplier.id }, await request.json().catch(() => null), {
      businessName: supplier.businessName,
      email: supplier.email,
    });
    return NextResponse.json({ account });
  } catch (error) {
    return supplierErrorResponse(error, "supplier payout save failed");
  }
}
