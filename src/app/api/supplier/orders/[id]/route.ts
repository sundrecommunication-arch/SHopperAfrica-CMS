import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/current-user";
import { requireSupplier } from "@/modules/dropship/services/supplier-service";
import { reportSupplierProblem, updateSupplierOrderStatus } from "@/modules/dropship/services/fulfilment-service";
import { getPublicOrigin } from "@/lib/request-origin";
import { supplierErrorResponse } from "../../_shared";

const schema = z.union([
  z.object({
    status: z.enum(["ACCEPTED", "SHIPPED", "DELIVERED"]),
    trackingNote: z.string().max(300).optional(),
  }),
  // "Can't deliver this order"
  z.object({ problem: z.string().max(500) }),
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supplier = await requireSupplier(await requireUserId(), { approved: true });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { id } = await params;
    if ("problem" in parsed.data) {
      await reportSupplierProblem(supplier.id, id, parsed.data.problem, getPublicOrigin(request));
    } else {
      await updateSupplierOrderStatus(supplier.id, id, parsed.data.status, parsed.data.trackingNote, getPublicOrigin(request));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return supplierErrorResponse(error, "supplier order update failed");
  }
}
