import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { addSupplierProductToStore, CatalogServiceError } from "@/modules/dropship/services/catalog-service";

/** "Add to my store" from the dropshipping catalog. */
export async function POST(request: Request) {
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const product = await addSupplierProductToStore(store.id, await request.json().catch(() => null));
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof TenantError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof CatalogServiceError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("dropship add to store failed", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
