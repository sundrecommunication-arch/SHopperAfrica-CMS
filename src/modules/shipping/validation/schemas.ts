import { z } from "zod";

// A "delivery option" is what the merchant sees: a name, a fee, and an
// optional free-delivery threshold (docs section 27). Under the hood it's
// one shipping_zones row with exactly one shipping_rates row.
export const deliveryOptionSchema = z.object({
  name: z.string().trim().min(2, "Give this delivery option a name, e.g. \"Lagos\" or \"Pickup\""),
  amount: z.number().nonnegative("Delivery fee can't be negative"),
  freeAboveAmount: z.number().positive().nullable().optional(),
});

export type DeliveryOptionInput = z.infer<typeof deliveryOptionSchema>;
