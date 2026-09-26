import "server-only";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { categories, productCategories } from "@/db/schema";
import { categorySchema, type CategoryInput } from "../validation/schemas";

export class CategoryServiceError extends Error {}

async function assertUniqueSlug(storeId: string, slug: string, excludeId?: string) {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.storeId, storeId), eq(categories.slug, slug)));
  if (rows.some((r) => r.id !== excludeId)) {
    throw new CategoryServiceError("That category URL is already in use");
  }
}

export async function createCategory(storeId: string, input: CategoryInput) {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    throw new CategoryServiceError(parsed.error.issues[0]?.message ?? "Invalid category data");
  }
  const data = parsed.data;
  await assertUniqueSlug(storeId, data.slug);

  const [category] = await db
    .insert(categories)
    .values({
      storeId,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      parentId: data.parentId || null,
      imageUrl: data.imageUrl || null,
    })
    .returning();
  return category;
}

export async function updateCategory(storeId: string, categoryId: string, input: CategoryInput) {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    throw new CategoryServiceError(parsed.error.issues[0]?.message ?? "Invalid category data");
  }
  const data = parsed.data;
  await assertUniqueSlug(storeId, data.slug, categoryId);

  if (data.parentId === categoryId) {
    throw new CategoryServiceError("A category can't be its own parent");
  }

  const [category] = await db
    .update(categories)
    .set({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      parentId: data.parentId || null,
      imageUrl: data.imageUrl || null,
      updatedAt: new Date(),
    })
    .where(and(eq(categories.id, categoryId), eq(categories.storeId, storeId)))
    .returning();

  if (!category) {
    throw new CategoryServiceError("Category not found");
  }
  return category;
}

export async function deleteCategory(storeId: string, categoryId: string) {
  const [deleted] = await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.storeId, storeId)))
    .returning({ id: categories.id });
  if (!deleted) {
    throw new CategoryServiceError("Category not found");
  }
  return deleted;
}

export async function listCategories(storeId: string) {
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.storeId, storeId))
    .orderBy(categories.name);

  if (rows.length === 0) return [];

  const counts = await db
    .select({ categoryId: productCategories.categoryId })
    .from(productCategories)
    .innerJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(eq(categories.storeId, storeId));

  const countMap = new Map<string, number>();
  for (const row of counts) {
    countMap.set(row.categoryId, (countMap.get(row.categoryId) ?? 0) + 1);
  }

  return rows.map((c) => ({ ...c, productCount: countMap.get(c.id) ?? 0 }));
}
