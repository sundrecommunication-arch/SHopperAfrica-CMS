import { z } from "zod";

export const orderItemInputSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantId: z.string().nullable().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const createOrderSchema = z.object({
  storeSlug: z.string().min(1, "Store slug is required"),
  customerName: z.string().min(2, "Customer name is required"),
  customerPhone: z.string().min(7, "Valid phone number is required"),
  customerEmail: z.string().email("Valid email is required").nullable().optional().or(z.literal("")),
  deliveryAddress: z.string().min(3, "Delivery address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().optional(),
  customerNotes: z.string().optional(),
  paymentMethodType: z.enum(["MANUAL", "CASH_ON_DELIVERY", "WHATSAPP", "PAYSTACK"]).default("MANUAL"),
  checkoutChannel: z.enum(["WEBSITE", "WHATSAPP"]).default("WEBSITE"),
  discountCode: z.string().optional(),
  items: z.array(orderItemInputSchema).min(1, "Cart cannot be empty"),
});

export const updateOrderStatusSchema = z.object({
  fulfillmentStatus: z
    .enum([
      "NEW",
      "CONFIRMED",
      "PROCESSING",
      "READY",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
    ])
    .optional(),
  paymentStatus: z
    .enum(["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"])
    .optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
