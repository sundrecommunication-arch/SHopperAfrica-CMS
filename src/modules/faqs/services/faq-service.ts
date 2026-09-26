import "server-only";
import { eq, and, asc, isNull } from "drizzle-orm";

import { db } from "@/db";
import { faqs } from "@/db/schema";
import { saveFaqsSchema, type FaqItemInput } from "../validation/schemas";

export class FaqServiceError extends Error {}

/**
 * Lists FAQs for one scope in the dashboard editor: the store-default list
 * (productId = null) or one specific product's own list. Used both to
 * populate the editor and, for the public site, as the raw per-scope query
 * that getPublicFaqsForProduct/getPublicStoreDefaultFaqs build on.
 */
export async function listFaqs(storeId: string, productId: string | null) {
  return db
    .select()
    .from(faqs)
    .where(
      and(
        eq(faqs.storeId, storeId),
        productId === null ? isNull(faqs.productId) : eq(faqs.productId, productId)
      )
    )
    .orderBy(asc(faqs.sortOrder));
}

/**
 * Replaces one scope's entire FAQ list in one go — same full-replace
 * pattern as saveNavItems (nav-service.ts): simpler and safer than diffing
 * a short reorderable list, and it never leaves a list half-updated.
 */
export async function saveFaqs(
  storeId: string,
  productId: string | null,
  items: FaqItemInput[]
) {
  const parsed = saveFaqsSchema.safeParse({ productId, items });
  if (!parsed.success) {
    throw new FaqServiceError(parsed.error.issues[0]?.message ?? "Invalid FAQ list");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(faqs)
      .where(
        and(
          eq(faqs.storeId, storeId),
          productId === null ? isNull(faqs.productId) : eq(faqs.productId, productId)
        )
      );

    if (parsed.data.items.length > 0) {
      await tx.insert(faqs).values(
        parsed.data.items.map((item, index) => ({
          storeId,
          productId,
          question: item.question,
          answer: item.answer,
          sortOrder: index,
        }))
      );
    }
  });

  return listFaqs(storeId, productId);
}
