import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/modules/auth/validation/schemas";
import { requestPasswordReset } from "@/modules/auth/services/password-reset-service";

const GENERIC_MESSAGE = "If an account exists for that email, we've sent a link to reset the password.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    await requestPasswordReset(parsed.data.email);
  } catch (error) {
    // Log the real cause (e.g. RESEND_API_KEY missing, Resend API error) but never
    // surface it to the client — same generic response either way, so this endpoint
    // can't be used to tell which emails have accounts.
    console.error("password reset request failed", error);
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
