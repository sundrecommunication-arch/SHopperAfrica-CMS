import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const blogPostSchema = z.object({
  title: z.string().min(2, "Title is required").max(200),
  slug: z
    .string()
    .min(2, "URL is required")
    .max(200)
    .regex(slugPattern, "Use lowercase letters, numbers and hyphens only"),
  excerpt: z.string().max(300).optional().or(z.literal("")),
  content: z.string().min(10, "Write a little more content before saving"),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  seoTitle: z.string().max(200).optional().or(z.literal("")),
  seoDescription: z.string().max(300).optional().or(z.literal("")),
});

export type BlogPostInput = z.infer<typeof blogPostSchema>;

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
