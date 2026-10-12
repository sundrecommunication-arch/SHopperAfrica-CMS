import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { runLifecycleEmails } from "@/modules/lifecycle/services/lifecycle-service";
import { runDropshipChecks } from "@/modules/dropship/services/fulfilment-service";
import { refreshWorldwideProducts, syncCjOrders } from "@/modules/dropship/global/cj-fulfilment";
import { getPublicOrigin } from "@/lib/request-origin";

// Sends any merchant lifecycle emails that are due (see lifecycle-service.ts),
// and runs the dropship late-order checks (fulfilment-service.ts).
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
  // Same hourly run: remind suppliers sitting on paid orders, alert Shopper about late ones.
  const origin = getPublicOrigin(request);
  const dropship = await runDropshipChecks(origin);
  // Worldwide (CJ): place/pay/track orders, refresh prices & stock.
  const worldwide = {
    orders: await syncCjOrders(origin),
    products: await refreshWorldwideProducts(origin),
  };
  return NextResponse.json({ ...result, dropship, worldwide });
}

export const GET = handle;
export const POST = handle;
