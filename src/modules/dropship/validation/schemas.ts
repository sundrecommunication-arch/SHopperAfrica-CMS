import { z } from "zod";

const phone = z
  .string()
  .trim()
  .min(7, "Enter a phone number")
  .max(20)
  .regex(/^[+\d\s()-]+$/, "Use digits only, e.g. 08012345678");

export const supplierApplicationSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name").max(120),
  phone,
  state: z.string().trim().min(2, "Choose where you ship from").max(60),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().min(10, "Tell merchants what you sell (a sentence or two)").max(1000),
  deliveryAreas: z.string().trim().min(2).max(200).default("Nationwide"),
  deliveryDays: z.string().trim().min(1).max(40).default("2-5 days"),
});
export type SupplierApplicationInput = z.infer<typeof supplierApplicationSchema>;

export const supplierProductSchema = z
  .object({
    name: z.string().trim().min(2, "Product name is required").max(200),
    description: z.string().trim().max(5000).optional().or(z.literal("")),
    images: z.array(z.string().url()).max(10).default([]),
    category: z.string().trim().max(60).optional().or(z.literal("")),
    wholesalePrice: z.coerce.number().positive("Enter your price to merchants"),
    suggestedPrice: z.coerce.number().min(0).optional().nullable(),
    stock: z.coerce.number().int("Whole number").min(0),
    sku: z.string().trim().max(100).optional().or(z.literal("")),
    isActive: z.boolean().default(true),
    // Sizes/colours, each with its own stock. Empty = no options.
    variants: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().trim().min(1).max(120),
          options: z.record(z.string(), z.string()).default({}),
          inventoryQuantity: z.coerce.number().int().min(0).default(0),
        })
      )
      .max(100)
      .default([]),
  })
  .refine((p) => !p.suggestedPrice || p.suggestedPrice >= p.wholesalePrice, {
    message: "Suggested selling price should be at least your wholesale price",
    path: ["suggestedPrice"],
  });
export type SupplierProductInput = z.infer<typeof supplierProductSchema>;

export const payoutAccountSchema = z.object({
  bankCode: z.string().trim().min(2, "Choose your bank").max(20),
  accountNumber: z.string().trim().regex(/^\d{10}$/, "Account numbers are 10 digits"),
});

export const addToStoreSchema = z.object({
  supplierProductId: z.string().min(1),
  price: z.coerce.number().positive("Enter your selling price"),
  publish: z.boolean().default(true),
});
