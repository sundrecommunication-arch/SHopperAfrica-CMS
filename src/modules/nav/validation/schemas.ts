import { z } from "zod";

export const navItemKinds = ["HOME", "PRODUCTS", "BLOG", "CONTACT", "CUSTOM"] as const;

export type NavItemKind = (typeof navItemKinds)[number];

export const navItemSchema = z
  .object({
    kind: z.enum(navItemKinds),
    label: z.string().min(1, "Label is required").max(50, "Keep it under 50 characters"),
    // Only meaningful for CUSTOM items — a relative path or a full external URL.
    url: z.string().trim().max(500).nullable().optional(),
    isVisible: z.boolean(),
  })
  .refine((item) => item.kind !== "CUSTOM" || Boolean(item.url && item.url.trim().length > 0), {
    message: "Add a link for this item",
    path: ["url"],
  });

export const navItemsSchema = z
  .array(navItemSchema)
  .max(20, "That's a lot of menu items — keep it under 20");

export type NavItemInput = z.infer<typeof navItemSchema>;
