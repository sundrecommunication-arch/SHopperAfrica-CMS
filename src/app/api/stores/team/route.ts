import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { getPublicOrigin } from "@/lib/request-origin";
import { listTeam, inviteStaffMember, StaffServiceError } from "@/modules/stores/services/staff-service";

// GET: any team member can see who's on the team and what invites are pending.
export async function GET() {
  try {
    const { store } = await getCurrentStore();
    const team = await listTeam(store.id);
    return NextResponse.json(team);
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("list team failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// POST: only the store owner can invite new team members.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const { store, role, userId } = await getCurrentStore();
    requireRole(role, ["OWNER"]);
    await inviteStaffMember({
      storeId: store.id,
      invitedByUserId: userId,
      origin: getPublicOrigin(request),
      input: body,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof StaffServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("invite staff member failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
