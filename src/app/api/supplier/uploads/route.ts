import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/current-user";
import { requireSupplier } from "@/modules/dropship/services/supplier-service";
import { uploadSupplierImage } from "@/lib/storage";
import { supplierErrorResponse } from "../_shared";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const supplier = await requireSupplier(await requireUserId(), { approved: true });
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: "Images must be under 5MB" }, { status: 400 });
    return NextResponse.json({ url: await uploadSupplierImage(supplier.id, file) }, { status: 201 });
  } catch (error) {
    return supplierErrorResponse(error, "supplier upload failed");
  }
}
