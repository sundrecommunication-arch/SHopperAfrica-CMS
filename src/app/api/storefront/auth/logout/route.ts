import { NextResponse } from "next/server";

import { logOutCustomer } from "@/modules/customer-auth/services/customer-auth-service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.storeSlug) {
    await logOutCustomer(body.storeSlug);
  }
  return NextResponse.json({ ok: true });
}
