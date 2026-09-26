import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const categorySchema = z.object({
  name: z.string().min(2, "Category name is required").max(100),
  slug: z
    .string()
    .min(2, "Category URL is required")
    .max(100)
    .regex(slugPattern, "Use lowercase letters, numbers and hyphens only"),
  description: z.string().max(1000).optional().or(z.literal("")),
  parentId: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
