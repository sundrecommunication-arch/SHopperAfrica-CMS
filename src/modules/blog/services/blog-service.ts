import "server-only";
import { eq, and, desc } from "drizzle-orm";

import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { blogPostSchema, type BlogPostInput } from "../validation/schemas";

export class BlogServiceError extends Error {}

async function assertUniqueSlug(storeId: string, slug: string, excludePostId?: string) {
  const rows = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(and(eq(blogPosts.storeId, storeId), eq(blogPosts.slug, slug)));
  if (rows.some((r) => r.id !== excludePostId)) {
    throw new BlogServiceError("That post URL is already in use");
  }
}

function parseInput(input: BlogPostInput) {
  const parsed = blogPostSchema.safeParse(input);
  if (!parsed.success) {
    throw new BlogServiceError(parsed.error.issues[0]?.message ?? "Invalid post data");
  }
  return parsed.data;
}

export async function createPost(storeId: string, input: BlogPostInput) {
  const data = parseInput(input);
  await assertUniqueSlug(storeId, data.slug);

  const [post] = await db
    .insert(blogPosts)
    .values({
      storeId,
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt || null,
      content: data.content,
      coverImageUrl: data.coverImageUrl || null,
      status: data.status,
      publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
    })
    .returning();
  return post;
}

export async function updatePost(storeId: string, postId: string, input: BlogPostInput) {
  const data = parseInput(input);
  await assertUniqueSlug(storeId, data.slug, postId);

  const [existing] = await db
    .select({ status: blogPosts.status, publishedAt: blogPosts.publishedAt })
    .from(blogPosts)
    .where(and(eq(blogPosts.id, postId), eq(blogPosts.storeId, storeId)))
    .limit(1);

  if (!existing) {
    throw new BlogServiceError("Post not found");
  }

  // Set publishedAt the first time a post goes live; leave it alone on later
  // edits so it keeps its original publish date (same idea as
  // Product.updatedAt vs createdAt — publishedAt marks when it first went
  // public, not when it was last saved).
  const publishedAt =
    data.status === "PUBLISHED" && !existing.publishedAt ? new Date() : existing.publishedAt;

  const [post] = await db
    .update(blogPosts)
    .set({
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt || null,
      content: data.content,
      coverImageUrl: data.coverImageUrl || null,
      status: data.status,
      publishedAt,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      updatedAt: new Date(),
    })
    .where(and(eq(blogPosts.id, postId), eq(blogPosts.storeId, storeId)))
    .returning();

  if (!post) {
    throw new BlogServiceError("Post not found");
  }
  return post;
}

export async function updatePostStatus(
  storeId: string,
  postId: string,
  status: BlogPostInput["status"]
) {
  const [existing] = await db
    .select({ publishedAt: blogPosts.publishedAt })
    .from(blogPosts)
    .where(and(eq(blogPosts.id, postId), eq(blogPosts.storeId, storeId)))
    .limit(1);
  if (!existing) {
    throw new BlogServiceError("Post not found");
  }

  const publishedAt = status === "PUBLISHED" && !existing.publishedAt ? new Date() : existing.publishedAt;

  const [post] = await db
    .update(blogPosts)
    .set({ status, publishedAt, updatedAt: new Date() })
    .where(and(eq(blogPosts.id, postId), eq(blogPosts.storeId, storeId)))
    .returning();
  if (!post) {
    throw new BlogServiceError("Post not found");
  }
  return post;
}

export async function deletePost(storeId: string, postId: string) {
  const [deleted] = await db
    .delete(blogPosts)
    .where(and(eq(blogPosts.id, postId), eq(blogPosts.storeId, storeId)))
    .returning({ id: blogPosts.id });
  if (!deleted) {
    throw new BlogServiceError("Post not found");
  }
  return deleted;
}

export async function listPosts(storeId: string) {
  return db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.storeId, storeId))
    .orderBy(desc(blogPosts.createdAt));
}

export async function getPostForEdit(storeId: string, postId: string) {
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.id, postId), eq(blogPosts.storeId, storeId)))
    .limit(1);
  return post ?? null;
}
