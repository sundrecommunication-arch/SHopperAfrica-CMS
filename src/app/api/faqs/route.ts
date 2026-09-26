import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { listFaqs, saveFaqs, FaqServiceError } from "@/modules/faqs/services/faq-service";

// ?productId=<id> for a product's own list, or omitted for the store-default list.
export async function GET(request: Request) {
  try {
    const { store } = await getCurrentStore();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const items = await listFaqs(store.id, productId);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("list faqs failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// A full replace for one scope (store-default, or one product) — the client
// always sends the complete, ordered list it wants to save for that scope.
export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const productId = body?.productId ?? null;
    const items = await saveFaqs(store.id, productId, body?.items ?? []);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof FaqServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("save faqs failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
