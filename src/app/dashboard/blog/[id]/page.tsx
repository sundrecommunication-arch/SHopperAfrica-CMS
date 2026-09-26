import { notFound } from "next/navigation";
import { getCurrentStore } from "@/lib/tenant";
import { getPostForEdit } from "@/modules/blog/services/blog-service";
import { BlogPostForm } from "@/components/dashboard/blog/blog-post-form";
import type { BlogPostInput } from "@/modules/blog/validation/schemas";

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store } = await getCurrentStore();
  const post = await getPostForEdit(store.id, id);

  if (!post) {
    notFound();
  }

  const initial: BlogPostInput = {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? "",
    content: post.content,
    coverImageUrl: post.coverImageUrl ?? "",
    status: post.status,
    seoTitle: post.seoTitle ?? "",
    seoDescription: post.seoDescription ?? "",
  };

  return <BlogPostForm initial={initial} postId={id} />;
}
