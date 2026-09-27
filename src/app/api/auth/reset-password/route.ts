import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/modules/auth/validation/schemas";
import { resetPassword, PasswordResetError } from "@/modules/auth/services/password-reset-service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    await resetPassword(parsed.data.token, parsed.data.password);
    return NextResponse.json({ message: "Password updated" });
  } catch (error) {
    if (error instanceof PasswordResetError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("password reset failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
