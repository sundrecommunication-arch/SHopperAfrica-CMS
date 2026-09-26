import { z } from "zod";

export const faqItemSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(200, "Keep it under 200 characters"),
  answer: z.string().trim().min(1, "Answer is required").max(2000, "Keep it under 2000 characters"),
});

export const faqListSchema = z
  .array(faqItemSchema)
  .max(50, "That's a lot of FAQs — keep it under 50 per list");

export type FaqItemInput = z.infer<typeof faqItemSchema>;

// productId: null saves the store-default list; a string id saves that
// product's own list.
export const saveFaqsSchema = z.object({
  productId: z.string().min(1).nullable(),
  items: faqListSchema,
});

export type SaveFaqsInput = z.infer<typeof saveFaqsSchema>;
