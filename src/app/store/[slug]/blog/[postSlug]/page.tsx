import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import {
  getPublicStoreBySlug,
  getPublicBlogPostBySlug,
} from "@/modules/storefront/services/storefront-service";

interface BlogPostPageProps {
  params: Promise<{ slug: string; postSlug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>;
}): Promise<Metadata> {
  const { slug, postSlug } = await params;
  const store = await getPublicStoreBySlug(slug);
  if (!store) return { title: "Store Not Found" };

  const post = await getPublicBlogPostBySlug(store.id, postSlug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug, postSlug } = await params;

  const store = await getPublicStoreBySlug(slug);
  if (!store) {
    notFound();
  }

  const post = await getPublicBlogPostBySlug(store.id, postSlug);
  if (!post) {
    notFound();
  }

  const paragraphs = post.content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={`/store/${slug}/blog`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to blog
      </Link>

      {post.publishedAt && (
        <p className="mb-2 text-sm text-muted-foreground">
          {new Date(post.publishedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      )}
      <h1 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>

      {post.coverImageUrl && (
        <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-lg border bg-muted">
          <Image src={post.coverImageUrl} alt={post.title} fill className="object-cover" sizes="768px" />
        </div>
      )}

      <div className="flex flex-col gap-4 text-base leading-relaxed">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
