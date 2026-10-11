import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/current-user";
import { listBanks } from "@/modules/dropship/services/payout-service";
import { supplierErrorResponse } from "@/app/api/supplier/_shared";

export async function GET() {
  try {
    await requireUserId();
    return NextResponse.json({ banks: await listBanks() });
  } catch (error) {
    return supplierErrorResponse(error, "bank list failed");
  }
}
