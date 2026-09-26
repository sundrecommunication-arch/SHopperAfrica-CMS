"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { z } from "zod";

import { blogPostSchema, slugify, type BlogPostInput } from "@/modules/blog/validation/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader, type UploadedImage } from "@/components/dashboard/products/image-uploader";

type BlogPostFormInput = z.input<typeof blogPostSchema>;
type BlogPostFormOutput = z.output<typeof blogPostSchema>;

const emptyDefaults: BlogPostInput = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  status: "DRAFT",
  seoTitle: "",
  seoDescription: "",
};

export function BlogPostForm({
  initial,
  postId,
}: {
  initial?: BlogPostInput;
  postId?: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [coverImage, setCoverImage] = useState<UploadedImage[]>(
    initial?.coverImageUrl ? [{ url: initial.coverImageUrl, isPrimary: true }] : []
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<BlogPostFormInput, unknown, BlogPostFormOutput>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: (initial ?? emptyDefaults) as BlogPostFormInput,
  });

  const title = useWatch({ control, name: "title" });
  const status = useWatch({ control, name: "status" }) ?? "DRAFT";

  async function onSubmit(values: BlogPostFormOutput) {
    setIsSubmitting(true);
    try {
      const payload = { ...values, coverImageUrl: coverImage[0]?.url ?? "" };
      const res = await fetch(postId ? `/api/blog/${postId}` : "/api/blog", {
        method: postId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save post");
        return;
      }
      if (!postId) {
        toast.success("Post created.");
        router.push("/dashboard/blog");
      } else {
        toast.success("Post updated.");
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{postId ? "Edit post" : "New post"}</h1>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => setValue("status", v as BlogPostInput["status"])}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : title ? `Save "${title}"` : "Save post"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. 5 Tips for Styling Ankara Prints"
              {...register("title", { onChange: (e) => setValue("slug", slugify(e.target.value)) })}
            />
            {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">Post URL</Label>
            <Input id="slug" {...register("slug")} />
            {errors.slug && <p className="text-destructive text-xs">{errors.slug.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Cover image</Label>
            <ImageUploader
              images={coverImage}
              onChange={setCoverImage}
              folder="blog"
              multiple={false}
              label="Add cover image"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              rows={2}
              placeholder="A short summary shown on the blog list page"
              {...register("excerpt")}
            />
            {errors.excerpt && <p className="text-destructive text-xs">{errors.excerpt.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              rows={16}
              placeholder="Write your post here. Leave a blank line between paragraphs."
              {...register("content")}
            />
            {errors.content && <p className="text-destructive text-xs">{errors.content.message}</p>}
          </div>
        </CardContent>
      </Card>

      <div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdvanced((v) => !v)}>
          {showAdvanced ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          Search engine listing
        </Button>
      </div>

      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle>Search engine listing</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pb-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seoTitle">SEO title</Label>
              <Input id="seoTitle" {...register("seoTitle")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seoDescription">SEO description</Label>
              <Textarea id="seoDescription" rows={2} {...register("seoDescription")} />
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  );
}
