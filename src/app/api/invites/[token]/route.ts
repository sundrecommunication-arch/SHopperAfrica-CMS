import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getInviteByToken } from "@/modules/stores/services/staff-service";

// Public: lets the invite-accept page show who's inviting and what account
// state to render, before the visitor signs in. No auth required to view —
// only to accept (see POST .../accept).
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await getInviteByToken(token);
  if (!invite) {
    return NextResponse.json({ error: "This invite link is invalid or has expired." }, { status: 404 });
  }

  const session = await auth();

  return NextResponse.json({
    storeName: invite.storeName,
    role: invite.role,
    email: invite.email,
    accountExists: invite.accountExists,
    signedInEmail: session?.user?.email ?? null,
  });
}
