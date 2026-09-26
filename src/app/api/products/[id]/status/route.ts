import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { updateProductStatus, ProductServiceError } from "@/modules/products/services/product-service";

const statusSchema = z.object({ status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const product = await updateProductStatus(store.id, id, parsed.data.status);
    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ProductServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("update product status failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
