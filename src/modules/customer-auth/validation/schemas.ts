import { z } from "zod";

export const customerSignupSchema = z.object({
  name: z.string().min(2, "Enter your name").max(100),
  phone: z.string().min(7, "Enter a valid phone number").max(30),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export const customerLoginSchema = z.object({
  identifier: z.string().min(3, "Enter your phone number or email"),
  password: z.string().min(1, "Enter your password"),
});

export type CustomerSignupInput = z.infer<typeof customerSignupSchema>;
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;
