import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const productImageSchema = z.object({
  id: z.string().optional(), // present when it's an existing image
  url: z.string().url(),
  isPrimary: z.boolean().default(false),
});

export const productVariantSchema = z.object({
  id: z.string().optional(), // present when it's an existing variant
  name: z.string().min(1, "Variant name is required"),
  options: z.record(z.string(), z.string()).default({}),
  sku: z.string().max(100).optional().or(z.literal("")),
  price: z.coerce.number().min(0).optional().nullable(),
  compareAtPrice: z.coerce.number().min(0).optional().nullable(),
  inventoryQuantity: z.coerce.number().int().min(0).default(0),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const productSchema = z.object({
  name: z.string().min(2, "Product name is required").max(200),
  slug: z
    .string()
    .min(2, "Product URL is required")
    .max(120)
    .regex(slugPattern, "Use lowercase letters, numbers and hyphens only"),
  description: z.string().max(5000).optional().or(z.literal("")),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  productType: z.string().max(100).optional().or(z.literal("")),
  brand: z.string().max(100).optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),

  price: z.coerce.number().min(0, "Price can't be negative"),
  compareAtPrice: z.coerce.number().min(0).optional().nullable(),
  sku: z.string().max(100).optional().or(z.literal("")),
  weight: z.coerce.number().min(0).optional().nullable(),

  // Inventory stays simple on purpose (docs section 12) — no ledger, just a count.
  trackInventory: z.boolean().default(true),
  inventoryQuantity: z.coerce.number().int().min(0).default(0),
  allowBackorder: z.boolean().default(false),
  lowStockThreshold: z.coerce.number().int().min(0).default(3),

  seoTitle: z.string().max(70).optional().or(z.literal("")),
  seoDescription: z.string().max(160).optional().or(z.literal("")),

  categoryIds: z.array(z.string()).default([]),
  images: z.array(productImageSchema).default([]),
  variants: z.array(productVariantSchema).default([]),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type ProductImageInput = z.infer<typeof productImageSchema>;

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
