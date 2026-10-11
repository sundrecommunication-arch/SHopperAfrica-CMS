import { NextResponse, after } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, PlatformAdminError } from "@/lib/platform-admin";
import { adminSetSupplierStatus, SupplierServiceError } from "@/modules/dropship/services/supplier-service";
import { sendSupplierStatusEmail } from "@/lib/email";
import { getPublicOrigin } from "@/lib/request-origin";

const schema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
  note: z.string().max(500).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { id } = await params;
    const supplier = await adminSetSupplierStatus(id, parsed.data.status, parsed.data.note);
    const portalUrl = `${getPublicOrigin(request)}/supplier`;
    after(() =>
      sendSupplierStatusEmail(supplier.email, {
        supplierName: supplier.businessName,
        status: parsed.data.status,
        note: supplier.statusNote,
        portalUrl,
      }).catch((error: unknown) => console.error("supplier status email failed", error))
    );
    return NextResponse.json({ supplier });
  } catch (error) {
    if (error instanceof PlatformAdminError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (error instanceof SupplierServiceError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("admin supplier update failed", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
