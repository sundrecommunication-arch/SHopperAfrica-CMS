import { NextResponse } from "next/server";

import { getPublicStoreBySlug } from "@/modules/storefront/services/storefront-service";
import {
  getCurrentCustomer,
  saveCustomerAddress,
  CustomerAuthError,
} from "@/modules/customer-auth/services/customer-auth-service";
import { saveAddressSchema } from "@/modules/customer-auth/validation/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeSlug, ...rest } = body ?? {};
    if (!storeSlug) {
      return NextResponse.json({ error: "Missing store" }, { status: 400 });
    }

    const store = await getPublicStoreBySlug(storeSlug);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Never trust a client-supplied customerId -- always resolve the
    // customer from their own session cookie for this store.
    const customer = await getCurrentCustomer(store.id, store.slug);
    if (!customer) {
      return NextResponse.json({ error: "Please sign in to save an address." }, { status: 401 });
    }

    const parsed = saveAddressSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Please check your details" },
        { status: 400 }
      );
    }

    const address = await saveCustomerAddress(customer.id, parsed.data);
    return NextResponse.json({ address });
  } catch (error) {
    if (error instanceof CustomerAuthError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Save customer address error:", error);
    return NextResponse.json({ error: "Could not save that address right now." }, { status: 500 });
  }
}
