import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { addProductImagesBulk, ProductServiceError } from "@/modules/products/services/product-service";

// Bulk photos: body { items: [{ productId, url }] }, urls from /api/uploads.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const result = await addProductImagesBulk(store.id, body.items);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ProductServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("bulk product images failed", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
