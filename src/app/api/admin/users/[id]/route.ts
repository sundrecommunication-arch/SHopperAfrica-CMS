import { NextResponse } from "next/server";
import { requirePlatformAdmin, PlatformAdminError } from "@/lib/platform-admin";
import { adminDeleteUser, AdminServiceError } from "@/modules/admin/services/admin-service";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: adminUserId } = await requirePlatformAdmin();
    const { id: userId } = await params;
    await adminDeleteUser({ userId, adminUserId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PlatformAdminError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error instanceof AdminServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("admin user delete failed", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
