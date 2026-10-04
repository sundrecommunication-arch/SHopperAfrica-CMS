import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { stores } from "@/db/schema";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import {
  generateDomainVerificationToken,
  getDomainDnsInstructions,
  isValidDomain,
} from "@/lib/domain-verification";
import { requestDomainAlias } from "@/services/vercel-domain";

const registerDomainSchema = z.object({
  customDomain: z.string().min(1).refine(isValidDomain, {
    message: "Enter a valid domain, e.g. shop.example.com",
  }),
});

/**
 * Dedicated "register a custom domain" endpoint — same effect as PATCHing
 * `customDomain` through /api/stores/settings, but also returns the DNS
 * instructions right away so a caller doesn't need a second round trip.
 */
export async function POST(request: Request) {
  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER"]);
    const body = await request.json();
    const parsed = registerDomainSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid domain" },
        { status: 400 }
      );
    }
    const { customDomain } = parsed.data;
    const token = generateDomainVerificationToken();

    const [updated] = await db
      .update(stores)
      .set({
        customDomain,
        domainVerified: false,
        domainVerificationToken: token,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, store.id))
      .returning();

    // Best-effort only: if this deployment is on Vercel and has API access
    // configured, also register the alias there. On any other host, the
    // merchant pointing DNS at the CNAME target below is what matters.
    if (process.env.VERCEL_PROJECT_ID && process.env.VERCEL_TOKEN) {
      try {
        await requestDomainAlias(process.env.VERCEL_PROJECT_ID, customDomain);
      } catch (err) {
        console.error("Vercel domain alias request failed (non-fatal):", err);
      }
    }

    return NextResponse.json({
      store: updated,
      instructions: getDomainDnsInstructions(customDomain, token),
    });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("register domain failed", error);
    return NextResponse.json({ error: "Failed to register domain" }, { status: 500 });
  }
}
