import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { urlSlugToPlatform } from "@/lib/ad-platforms";
import { getConnection } from "@/modules/ads/services/ad-connections-service";
import { syncConnection } from "@/modules/ads/services/ad-sync-service";

/** Manual "Refresh now" button on the Ad Performance dashboard. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform: platformSlug } = await params;
  const platform = urlSlugToPlatform(platformSlug);
  if (!platform) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }

  try {
    const { store, role } = await getCurrentStore();
    requireRole(role, ["OWNER", "MANAGER", "STAFF"]);

    const connection = await getConnection(store.id, platform);
    if (!connection || connection.status === "DISCONNECTED") {
      return NextResponse.json({ error: "This platform isn't connected." }, { status: 400 });
    }

    const result = await syncConnection(connection);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error(`Ad platform sync failed (${platformSlug})`, error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
