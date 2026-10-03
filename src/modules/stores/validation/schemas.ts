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

// --- Staff / team management -------------------------------------------------

// OWNER is deliberately excluded here — invites only ever grant MANAGER or
// STAFF. A store's OWNER is set at creation and transferring ownership isn't
// a flow this app supports yet.
export const inviteStaffSchema = z.object({
  email: z.string().email("Enter a valid email"),
  role: z.enum(["MANAGER", "STAFF"]),
});

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(["MANAGER", "STAFF"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(1, "Missing invite token"),
  // Only required when the invited email doesn't already have an account —
  // see POST /api/invites/[token]/accept.
  name: z.string().min(2, "Enter your name").max(100).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
