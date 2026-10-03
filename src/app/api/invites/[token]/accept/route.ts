import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getInviteByToken, acceptInvite, StaffServiceError } from "@/modules/stores/services/staff-service";
import { createUser, AuthServiceError } from "@/modules/auth/services/user-service";

const newAccountSchema = z.object({
  name: z.string().min(2, "Enter your name").max(100),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Accepts an invite. The invited email always comes from the invite record
 * itself, never from the request body — that's what makes this safe:
 *
 * - Email already has an account: the caller must already be signed in as
 *   that exact email (checked via the session cookie). This endpoint never
 *   accepts a password for an existing account — that would let anyone
 *   holding an invite link take over an existing account. Signing in
 *   happens the normal way, through /login, before the invite link is
 *   opened again.
 * - Brand-new email: name + password create the account here, then the
 *   invite is accepted for that new user. The client signs in right after
 *   with the same credentials (see accept-invite-form.tsx).
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));

  const invite = await getInviteByToken(token);
  if (!invite) {
    return NextResponse.json({ error: "This invite link is invalid or has expired." }, { status: 404 });
  }

  try {
    if (invite.accountExists) {
      const session = await auth();
      if (!session?.user?.id || session.user.email?.toLowerCase() !== invite.email.toLowerCase()) {
        return NextResponse.json(
          { error: "Please sign in with this email address first, then open the invite link again." },
          { status: 401 }
        );
      }
      const { storeSlug } = await acceptInvite(token, session.user.id);
      return NextResponse.json({ storeSlug });
    }

    const parsed = newAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const user = await createUser({
      name: parsed.data.name,
      email: invite.email,
      password: parsed.data.password,
    });
    const { storeSlug } = await acceptInvite(token, user.id);
    return NextResponse.json({ storeSlug, email: invite.email });
  } catch (error) {
    if (error instanceof StaffServiceError || error instanceof AuthServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("accept invite failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
