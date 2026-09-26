import { NextResponse } from "next/server";
import { getCurrentStore, TenantError } from "@/lib/tenant";
import { uploadStoreImage } from "@/lib/storage";

const ALLOWED_FOLDERS = ["products", "categories", "branding", "blog"] as const;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const { store } = await getCurrentStore();
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (
      typeof folder !== "string" ||
      !ALLOWED_FOLDERS.includes(folder as (typeof ALLOWED_FOLDERS)[number])
    ) {
      return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Images must be under 5MB" }, { status: 400 });
    }

    const url = await uploadStoreImage(store.id, folder as (typeof ALLOWED_FOLDERS)[number], file);
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("upload failed", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
