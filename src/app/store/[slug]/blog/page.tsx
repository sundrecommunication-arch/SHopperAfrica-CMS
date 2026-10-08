import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getStorefrontI18n } from "@/i18n/server";
import type { Metadata } from "next";
import { Newspaper } from "lucide-react";

import {
  getPublicStoreBySlug,
  getPublicBlogPosts,
} from "@/modules/storefront/services/storefront-service";

interface BlogListPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);
  if (!store) return { title: "Store Not Found" };
  return {
    title: "Blog",
    description: `News, guides and updates from ${store.name}`,
  };
}

export default async function BlogListPage({ params }: BlogListPageProps) {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);
  if (!store) {
    notFound();
  }

  const [posts, { t }] = await Promise.all([
    getPublicBlogPosts(store.id),
    getStorefrontI18n(store.locale),
  ]);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">{t("blog.title")}</h1>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <Newspaper className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">{t("blog.empty")}</p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/store/${slug}/blog/${post.slug}`}
              className="group flex flex-col gap-3"
            >
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg border bg-muted">
                {post.coverImageUrl ? (
                  <Image
                    src={post.coverImageUrl}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(min-width: 640px) 45vw, 100vw"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Newspaper className="size-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                {post.publishedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.publishedAt).toLocaleDateString(t.locale, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                )}
                <h2 className="text-lg font-semibold tracking-tight group-hover:underline">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
