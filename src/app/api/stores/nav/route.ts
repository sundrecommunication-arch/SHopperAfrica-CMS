import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { listNavItems, saveNavItems, NavServiceError } from "@/modules/nav/services/nav-service";
import { navItemsSchema } from "@/modules/nav/validation/schemas";

export async function GET() {
  try {
    const { store } = await getCurrentStore();
    const items = await listNavItems(store.id);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("list nav items failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// A full replace, not a partial update — the client always sends the
// complete, ordered menu it wants to save (see NavItemsManager).
export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = navItemsSchema.safeParse(body?.items);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 }
    );
  }
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const items = await saveNavItems(store.id, parsed.data);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof NavServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("save nav items failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
