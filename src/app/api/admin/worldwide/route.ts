import { NextResponse } from "next/server";
import { requirePlatformAdmin, PlatformAdminError } from "@/lib/platform-admin";
import { cjConfigured, searchCjProducts } from "@/modules/dropship/global/cj-client";
import { usdToNgnRate } from "@/modules/dropship/global/fx";

/** Admin check: is the CJ account connected, and what dollar rate are prices using? */
export async function GET() {
  try {
    await requirePlatformAdmin();
  } catch (error) {
    if (error instanceof PlatformAdminError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw error;
  }
  const result: Record<string, unknown> = { configured: cjConfigured() };
  try {
    result.fx = await usdToNgnRate();
  } catch (error) {
    result.fxError = error instanceof Error ? error.message : String(error);
  }
  if (cjConfigured()) {
    try {
      const { items, total } = await searchCjProducts("bag", 1, 3);
      result.connected = true;
      result.sample = { total, names: items.map((i) => i.name) };
    } catch (error) {
      result.connected = false;
      result.error = error instanceof Error ? error.message : String(error);
    }
  }
  return NextResponse.json(result);
}
