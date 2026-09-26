import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import {
  createCategory,
  listCategories,
  CategoryServiceError,
} from "@/modules/categories/services/category-service";

export async function GET() {
  try {
    const { store } = await getCurrentStore();
    const items = await listCategories(store.id);
    return NextResponse.json({ categories: items });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("list categories failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const category = await createCategory(store.id, body);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof CategoryServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("create category failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
