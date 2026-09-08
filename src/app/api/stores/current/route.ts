import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { updateStoreGeneral, StoreServiceError } from "@/modules/stores/services/store-service";

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);

    const updated = await updateStoreGeneral(store.id, body);
    return NextResponse.json({ store: updated });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof StoreServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("store update failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
