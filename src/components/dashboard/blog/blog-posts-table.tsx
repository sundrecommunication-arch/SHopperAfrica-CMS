"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MoreHorizontal, Newspaper, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface BlogPostListItem {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED";
  coverImageUrl: string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
}

const statusVariant = {
  PUBLISHED: "success",
  DRAFT: "secondary",
} as const;

export function BlogPostsTable({ posts }: { posts: BlogPostListItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/blog/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not delete post");
        return;
      }
      toast.success(`"${title}" deleted.`);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleStatusChange(id: string, title: string, status: BlogPostListItem["status"]) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/blog/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not update post");
        return;
      }
      toast.success(status === "PUBLISHED" ? `"${title}" published.` : `"${title}" moved to draft.`);
      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14" />
          <TableHead>Post</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Published</TableHead>
          <TableHead className="w-9" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.map((post) => (
          <TableRow key={post.id}>
            <TableCell>
              <div className="relative size-10 overflow-hidden rounded-md border bg-muted">
                {post.coverImageUrl ? (
                  <Image src={post.coverImageUrl} alt="" fill className="object-cover" sizes="40px" />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Newspaper className="size-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Link href={`/dashboard/blog/${post.id}`} className="font-medium hover:underline">
                {post.title}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant[post.status]}>{post.status}</Badge>
            </TableCell>
            <TableCell>
              <span className="text-muted-foreground text-sm">
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString()
                  : "Not published"}
              </span>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deletingId === post.id || updatingId === post.id}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/blog/${post.id}`}>
                      <Pencil className="size-4" /> Edit
                    </Link>
                  </DropdownMenuItem>
                  {post.status === "PUBLISHED" ? (
                    <DropdownMenuItem onClick={() => handleStatusChange(post.id, post.title, "DRAFT")}>
                      <EyeOff className="size-4" /> Unpublish
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleStatusChange(post.id, post.title, "PUBLISHED")}>
                      <Eye className="size-4" /> Publish
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="destructive" onClick={() => handleDelete(post.id, post.title)}>
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
