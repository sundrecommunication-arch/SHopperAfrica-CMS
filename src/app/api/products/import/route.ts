import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { importProducts, ProductServiceError } from "@/modules/products/services/product-service";

// Bulk product import: body { rows: ImportRow[], publish: boolean }, rows
// already parsed from the merchant's spreadsheet in the browser and checked
// again here.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const result = await importProducts(store.id, body.rows, body.publish !== false);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ProductServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("product import failed", error);
    return NextResponse.json({ error: "Something went wrong. No products were imported." }, { status: 500 });
  }
}
