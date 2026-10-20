import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { removeStripeKeys, saveStripeKeys, StripeConnectError } from "@/modules/payments/services/stripe-connect-service";

const bodySchema = z.object({
  secretKey: z.string().trim().min(1, "Paste your Stripe key").max(300),
  webhookSecret: z.string().trim().max(300).optional().nullable(),
});

/** Saves the merchant's own Stripe key (checked with Stripe first). Owner/manager only, like other payment keys. */
export async function POST(request: Request) {
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    await saveStripeKeys(store.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TenantError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof StripeConnectError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("save stripe keys failed", error);
    return NextResponse.json({ error: "Couldn't save. Please try again." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    await removeStripeKeys(store.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TenantError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }
}
