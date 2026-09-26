import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import {
  updateCategory,
  deleteCategory,
  CategoryServiceError,
} from "@/modules/categories/services/category-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const category = await updateCategory(store.id, id, body);
    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof CategoryServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("update category failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    await deleteCategory(store.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof CategoryServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("delete category failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
