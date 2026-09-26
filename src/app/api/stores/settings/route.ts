import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { stores } from "@/db/schema";
import { getCurrentStore } from "@/lib/tenant";
import { generateDomainVerificationToken, isValidDomain } from "@/lib/domain-verification";

const updateStoreSettingsSchema = z.object({
  isPublished: z.boolean().optional(),
  currency: z.string().min(1).optional(),
  currencySymbol: z.string().min(1).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  addressText: z.string().nullable().optional(),
  customDomain: z
    .string()
    .nullable()
    .optional()
    .refine((value) => !value || isValidDomain(value), {
      message: "Enter a valid domain, e.g. shop.example.com",
    }),
  locale: z.enum(["en", "fr", "es"]).optional(),
  logoUrl: z.string().url().nullable().optional(),
  heroImages: z.array(z.string().url()).max(8).optional(),
  heroShowText: z.boolean().optional(),
  heroTextPosition: z.enum(["center", "bottom-left", "bottom-center", "bottom-right"]).optional(),
  abandonedCartThresholdHours: z.number().int().min(1).max(168).optional(),
});

export async function PATCH(request: Request) {
  try {
    const { store } = await getCurrentStore();
    const body = await request.json();
    const parsed = updateStoreSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid settings" },
        { status: 400 }
      );
    }

    const updateData: typeof parsed.data & {
      domainVerificationToken?: string | null;
      domainVerified?: boolean;
    } = { ...parsed.data };

    // Changing the custom domain always resets verification — a new domain
    // needs its own DNS TXT proof, and clearing the domain clears the token
    // so a stale one can't verify a different domain later.
    if ("customDomain" in parsed.data) {
      const nextDomain = parsed.data.customDomain;
      if (nextDomain && nextDomain !== store.customDomain) {
        updateData.domainVerificationToken = generateDomainVerificationToken();
        updateData.domainVerified = false;
      } else if (!nextDomain) {
        updateData.domainVerificationToken = null;
        updateData.domainVerified = false;
      }
    }

    const [updated] = await db
      .update(stores)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, store.id))
      .returning();

    return NextResponse.json({ store: updated });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("update store settings failed", error);
    return NextResponse.json({ error: "Failed to update store settings" }, { status: 500 });
  }
}
