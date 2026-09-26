import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { createPost, listPosts, BlogServiceError } from "@/modules/blog/services/blog-service";

export async function GET() {
  try {
    const { store } = await getCurrentStore();
    const posts = await listPosts(store.id);
    return NextResponse.json({ posts });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("list blog posts failed", error);
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
    const post = await createPost(store.id, body);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof BlogServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("create blog post failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
