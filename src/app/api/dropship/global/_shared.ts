import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { GlobalServiceError } from "@/modules/dropship/global/global-service";
import { CatalogServiceError } from "@/modules/dropship/services/catalog-service";

/** The merchant's store, checked for worldwide dropshipping (Naira stores, owner/manager). */
export async function worldwideStore() {
  const { store, role } = await getCurrentStore();
  requireRole(role, ["OWNER", "MANAGER"]);
  if (store.currency !== "NGN") throw new GlobalServiceError("Worldwide dropshipping is available for Naira stores for now.");
  return store;
}

export function worldwideError(error: unknown) {
  if (error instanceof TenantError) return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof GlobalServiceError || error instanceof CatalogServiceError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error("worldwide dropship request failed", error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
