import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { updatePost, deletePost, BlogServiceError } from "@/modules/blog/services/blog-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const post = await updatePost(store.id, id, body);
    return NextResponse.json({ post });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof BlogServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("update blog post failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    await deletePost(store.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof BlogServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("delete blog post failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
