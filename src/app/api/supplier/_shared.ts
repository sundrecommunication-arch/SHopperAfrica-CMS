import { NextResponse } from "next/server";
import { NotSignedInError } from "@/lib/current-user";
import { SupplierServiceError } from "@/modules/dropship/services/supplier-service";
import { PayoutServiceError } from "@/modules/dropship/services/payout-service";
import { FulfilmentError } from "@/modules/dropship/services/fulfilment-service";

/** Maps the supplier portal's known errors to friendly JSON responses. */
export function supplierErrorResponse(error: unknown, fallback: string) {
  if (error instanceof NotSignedInError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof SupplierServiceError || error instanceof PayoutServiceError || error instanceof FulfilmentError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
