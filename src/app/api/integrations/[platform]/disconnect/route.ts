import { NextResponse } from "next/server";
import { getCurrentStore, requireRole, TenantError } from "@/lib/tenant";
import { urlSlugToPlatform } from "@/lib/ad-platforms";
import {
  AdConnectionsServiceError,
  disconnectConnection,
} from "@/modules/ads/services/ad-connections-service";

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
    requireRole(role, ["OWNER", "MANAGER"]);
    const connection = await disconnectConnection(store.id, platform);
    return NextResponse.json({ connection });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AdConnectionsServiceError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error(`Ad platform disconnect failed (${platformSlug})`, error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
