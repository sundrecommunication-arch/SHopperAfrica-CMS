import { z } from "zod";

export const createDiscountSchema = z.object({
  code: z
    .string()
    .min(2, "Discount code must be at least 2 characters")
    .transform((c) => c.toUpperCase().trim()),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().positive("Discount value must be greater than 0"),
  minOrderAmount: z.number().nonnegative().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const validateCouponSchema = z.object({
  storeSlug: z.string().min(1, "Store slug is required"),
  code: z.string().min(1, "Coupon code is required"),
  subtotal: z.number().positive("Subtotal must be positive"),
});

export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
