import { z } from "zod";

export const bankTransferConfigSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(5, "Valid account number is required"),
  accountName: z.string().min(1, "Account name is required"),
  instructions: z.string().optional(),
});

export const savePaymentProviderSchema = z.object({
  type: z.enum([
    "MANUAL",
    "CASH_ON_DELIVERY",
    "WHATSAPP",
    "PAYSTACK",
    "FLUTTERWAVE",
    "STRIPE",
  ]),
  label: z.string().min(1, "Label is required"),
  isEnabled: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).default({}),
});

export type SavePaymentProviderInput = z.infer<typeof savePaymentProviderSchema>;
export type BankTransferConfig = z.infer<typeof bankTransferConfigSchema>;
