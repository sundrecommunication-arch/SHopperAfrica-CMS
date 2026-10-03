import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { updateMemberRole, removeMember, StaffServiceError } from "@/modules/stores/services/staff-service";

// PATCH: change a team member's role. Owner-only; the owner's own role can't
// be changed here (staff-service.ts rejects that).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER"]);
    await updateMemberRole(store.id, id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof StaffServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("update member role failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// DELETE: remove a team member. Owner-only; removing the store's last owner
// is rejected (staff-service.ts).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER"]);
    await removeMember(store.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof StaffServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("remove team member failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
