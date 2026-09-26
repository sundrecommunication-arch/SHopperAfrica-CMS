import { z } from "zod";

export const policyTypes = [
  "PRIVACY_POLICY",
  "RETURN_POLICY",
  "SHIPPING_POLICY",
  "TERMS_OF_SERVICE",
] as const;

export type PolicyType = (typeof policyTypes)[number];

export const policySchema = z.object({
  title: z.string().min(2, "Title is required").max(200),
  content: z.string().min(10, "Write a little more content before saving"),
  isPublished: z.boolean().default(false),
});

export type PolicyInput = z.infer<typeof policySchema>;
