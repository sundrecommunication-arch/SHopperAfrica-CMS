import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { runLifecycleEmails } from "@/modules/lifecycle/services/lifecycle-service";

// Sends any merchant lifecycle emails that are due (see lifecycle-service.ts).
// Call hourly with `Authorization: Bearer $CRON_SECRET` -- the scheduled
// GitHub Action in .github/workflows/lifecycle-emails.yml does this. Safe to
// call more often or twice in a row: each email goes out at most once.

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runLifecycleEmails();
  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;
