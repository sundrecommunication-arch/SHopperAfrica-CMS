import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, PlatformAdminError } from "@/lib/platform-admin";
import {
  adminSetPlan,
  adminSetSuspended,
  AdminServiceError,
} from "@/modules/admin/services/admin-service";

const patchSchema = z.union([
  z.object({
    action: z.literal("set_plan"),
    plan: z.enum(["FREE", "STARTER", "BUSINESS"]),
    periodEnd: z.string().nullable().optional(),
  }),
  z.object({
    action: z.literal("suspend"),
    suspended: z.boolean(),
    reason: z.string().max(500).optional(),
  }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requirePlatformAdmin();
    const { id: storeId } = await params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (parsed.data.action === "set_plan") {
      const periodEnd = parsed.data.periodEnd ? new Date(parsed.data.periodEnd) : null;
      if (periodEnd && isNaN(periodEnd.getTime())) {
        return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
      }
      await adminSetPlan({ storeId, adminUserId: userId, plan: parsed.data.plan, periodEnd });
    } else {
      await adminSetSuspended({
        storeId,
        adminUserId: userId,
        suspended: parsed.data.suspended,
        reason: parsed.data.reason,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PlatformAdminError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error instanceof AdminServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("admin store update failed", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
