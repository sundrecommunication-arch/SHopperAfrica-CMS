import { NextResponse } from "next/server";
import { getCurrentStore, TenantError } from "@/lib/tenant";
import { getAdapter, getRedirectUri, urlSlugToPlatform } from "@/lib/ad-platforms";
import { verifyOAuthState } from "@/lib/ad-platforms/oauth-state";
import { getAppBaseUrl } from "@/lib/ad-platforms/config";
import { upsertConnection } from "@/modules/ads/services/ad-connections-service";
import { syncConnection } from "@/modules/ads/services/ad-sync-service";

/** Where Google/Meta/TikTok redirect back to after the merchant approves (or denies) access. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform: platformSlug } = await params;
  const platform = urlSlugToPlatform(platformSlug);
  const dashboardUrl = new URL("/dashboard/ad-performance", getAppBaseUrl());

  if (!platform) {
    dashboardUrl.searchParams.set("error", "unknown_platform");
    return NextResponse.redirect(dashboardUrl);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthDenied = url.searchParams.get("error");

  if (oauthDenied) {
    dashboardUrl.searchParams.set("error", `${platformSlug}_denied`);
    return NextResponse.redirect(dashboardUrl);
  }
  if (!code || !state) {
    dashboardUrl.searchParams.set("error", `${platformSlug}_invalid_callback`);
    return NextResponse.redirect(dashboardUrl);
  }

  const storeId = verifyOAuthState(state);
  if (!storeId) {
    dashboardUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(dashboardUrl);
  }

  try {
    // Re-verifies the signed-in user actually belongs to this store — the
    // state parameter says which store initiated the connection, but
    // membership is still checked fresh here (docs section 38/39 pattern).
    const { store, userId } = await getCurrentStore(storeId);

    const adapter = getAdapter(platform);
    const redirectUri = getRedirectUri(platform);
    const tokens = await adapter.exchangeCode(code, redirectUri);
    const account = await adapter.fetchAccountInfo(tokens);
    const connection = await upsertConnection(store.id, platform, tokens, account, userId);

    // Pull an initial 30 days of history right away so the dashboard isn't
    // empty right after connecting — failures here don't undo the
    // connection, they just leave it to the next scheduled sync.
    if (connection) {
      await syncConnection(connection);
    }

    dashboardUrl.searchParams.set("connected", platformSlug);
  } catch (error) {
    if (error instanceof TenantError) {
      dashboardUrl.searchParams.set("error", "not_authorized");
      return NextResponse.redirect(dashboardUrl);
    }
    console.error(`Ad platform connect failed (${platformSlug})`, error);
    dashboardUrl.searchParams.set("error", `${platformSlug}_connect_failed`);
  }

  return NextResponse.redirect(dashboardUrl);
}
