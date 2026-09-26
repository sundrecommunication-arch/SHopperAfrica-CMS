import { NextResponse } from "next/server";
import { getCurrentStore } from "@/lib/tenant";
import {
  updateCustomerNotes,
  CustomerServiceError,
} from "@/modules/customers/services/customer-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { store } = await getCurrentStore();
    const { id: customerId } = await params;
    const body = await request.json();

    const updated = await updateCustomerNotes(store.id, customerId, body.notes);
    return NextResponse.json({ customer: updated });
  } catch (error) {
    if (error instanceof CustomerServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update customer notes" }, { status: 500 });
  }
}
