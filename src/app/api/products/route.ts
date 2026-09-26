import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { createProduct, listProducts, ProductServiceError } from "@/modules/products/services/product-service";

export async function GET() {
  try {
    const { store } = await getCurrentStore();
    const items = await listProducts(store.id);
    return NextResponse.json({ products: items });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("list products failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const product = await createProduct(store.id, body);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ProductServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("create product failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
