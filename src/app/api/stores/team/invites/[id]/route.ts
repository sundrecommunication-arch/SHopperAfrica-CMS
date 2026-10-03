import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { revokeInvite } from "@/modules/stores/services/staff-service";

// DELETE: revoke a pending invite before it's accepted. Owner-only.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER"]);
    await revokeInvite(store.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("revoke invite failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
