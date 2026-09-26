import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { stores } from "@/db/schema";
import { getCurrentStore, TenantError } from "@/lib/tenant";
import { getDomainDnsInstructions, verifyDomainOwnership } from "@/lib/domain-verification";

/** Current domain status + the DNS instructions to show while it's pending. */
export async function GET() {
  try {
    const { store } = await getCurrentStore();
    if (!store.customDomain || !store.domainVerificationToken) {
      return NextResponse.json({ customDomain: store.customDomain, domainVerified: store.domainVerified, instructions: null });
    }
    return NextResponse.json({
      customDomain: store.customDomain,
      domainVerified: store.domainVerified,
      instructions: getDomainDnsInstructions(store.customDomain, store.domainVerificationToken),
    });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Could not load domain status." }, { status: 500 });
  }
}

/** Re-checks DNS for the merchant's pending domain and flips it to verified on success. */
export async function POST() {
  try {
    const { store } = await getCurrentStore();
    if (!store.customDomain) {
      return NextResponse.json({ error: "No custom domain is set for this store." }, { status: 400 });
    }
    if (store.domainVerified) {
      return NextResponse.json({ verified: true, store });
    }
    if (!store.domainVerificationToken) {
      return NextResponse.json({ error: "No verification in progress for this domain." }, { status: 400 });
    }

    const verified = await verifyDomainOwnership(store.customDomain, store.domainVerificationToken);
    if (!verified) {
      return NextResponse.json({
        verified: false,
        instructions: getDomainDnsInstructions(store.customDomain, store.domainVerificationToken),
      });
    }

    const [updated] = await db
      .update(stores)
      .set({ domainVerified: true, updatedAt: new Date() })
      .where(eq(stores.id, store.id))
      .returning();

    return NextResponse.json({ verified: true, store: updated });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("domain verify failed", error);
    return NextResponse.json({ error: "Could not verify domain right now." }, { status: 500 });
  }
}
