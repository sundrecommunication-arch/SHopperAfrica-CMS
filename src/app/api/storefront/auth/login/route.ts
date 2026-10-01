import { NextResponse } from "next/server";

import { getPublicStoreBySlug } from "@/modules/storefront/services/storefront-service";
import { logInCustomer, CustomerAuthError } from "@/modules/customer-auth/services/customer-auth-service";
import { customerLoginSchema } from "@/modules/customer-auth/validation/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeSlug, ...rest } = body ?? {};
    if (!storeSlug) {
      return NextResponse.json({ error: "Missing store" }, { status: 400 });
    }

    const parsed = customerLoginSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Please check your details" },
        { status: 400 }
      );
    }

    const store = await getPublicStoreBySlug(storeSlug);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const customer = await logInCustomer(store.id, store.slug, parsed.data);
    return NextResponse.json({
      customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email },
    });
  } catch (error) {
    if (error instanceof CustomerAuthError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Customer login error:", error);
    return NextResponse.json({ error: "Could not sign you in right now." }, { status: 500 });
  }
}
