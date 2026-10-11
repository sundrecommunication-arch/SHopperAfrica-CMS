import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/current-user";
import { lookUpAccount } from "@/modules/dropship/services/payout-service";
import { supplierErrorResponse } from "@/app/api/supplier/_shared";

/** Bank account name lookup for the payout forms ("Is this you? ADUNNI BAKARE"). */
export async function POST(request: Request) {
  try {
    await requireUserId();
    return NextResponse.json(await lookUpAccount(await request.json().catch(() => null)));
  } catch (error) {
    return supplierErrorResponse(error, "account lookup failed");
  }
}
