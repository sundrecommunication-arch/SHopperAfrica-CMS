import { NextResponse } from "next/server";
import {
  optOutOfLifecycleEmails,
  verifyUnsubscribeToken,
} from "@/modules/lifecycle/services/lifecycle-service";

// One-click unsubscribe (RFC 8058): Gmail/Outlook's own "Unsubscribe" button
// POSTs here using the List-Unsubscribe header on tips/nudge emails. The
// link inside the email opens the /unsubscribe confirm page instead.
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("u") ?? "";
  const token = searchParams.get("t") ?? "";
  if (!userId || !verifyUnsubscribeToken(userId, token)) {
    return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 });
  }
  await optOutOfLifecycleEmails(userId);
  return NextResponse.json({ ok: true });
}
