import Link from "next/link";
import { Newspaper, Plus } from "lucide-react";
import { getCurrentStore } from "@/lib/tenant";
import { listPosts } from "@/modules/blog/services/blog-service";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { BlogPostsTable } from "@/components/dashboard/blog/blog-posts-table";

export default async function BlogPostsPage() {
  const { store } = await getCurrentStore();
  const posts = await listPosts(store.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Blog</h1>
        <Button asChild>
          <Link href="/dashboard/blog/new">
            <Plus className="size-4" /> New post
          </Link>
        </Button>
      </div>
      {posts.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No posts yet."
          description="Write your first post to share news, guides, or updates with your customers."
          action={
            <Button asChild>
              <Link href="/dashboard/blog/new">New post</Link>
            </Button>
          }
        />
      ) : (
        <BlogPostsTable posts={posts} />
      )}
    </div>
  );
}
