import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { listPolicies, upsertPolicy, PolicyServiceError } from "@/modules/policies/services/policy-service";
import { policySchema, policyTypes } from "@/modules/policies/validation/schemas";

export async function GET() {
  try {
    const { store } = await getCurrentStore();
    const policies = await listPolicies(store.id);
    return NextResponse.json({ policies });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("list policies failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

const updateSchema = policySchema.extend({
  type: z.enum(policyTypes),
});

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 }
    );
  }
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const { type, ...input } = parsed.data;
    const policy = await upsertPolicy(store.id, type, input);
    return NextResponse.json({ policy });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof PolicyServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("update policy failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
