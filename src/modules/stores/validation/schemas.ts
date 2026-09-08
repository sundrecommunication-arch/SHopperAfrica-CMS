import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createStoreSchema = z.object({
  name: z.string().min(2, "Store name is required").max(100),
  slug: z
    .string()
    .min(2, "Store URL is required")
    .max(60)
    .regex(slugPattern, "Use lowercase letters, numbers and hyphens only"),
  whatsappNumber: z.string().min(7, "Enter a valid phone number").optional().or(z.literal("")),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;

export const updateStoreGeneralSchema = z.object({
  name: z.string().min(2, "Store name is required").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  contactEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  contactPhone: z.string().max(30).optional().or(z.literal("")),
  whatsappNumber: z.string().max(30).optional().or(z.literal("")),
  whatsappEnabled: z.boolean(),
});

export type UpdateStoreGeneralInput = z.infer<typeof updateStoreGeneralSchema>;

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
