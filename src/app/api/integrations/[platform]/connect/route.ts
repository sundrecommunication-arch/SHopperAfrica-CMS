import { NextResponse } from "next/server";
import { getCurrentStore, TenantError } from "@/lib/tenant";
import {
  getAdapter,
  getRedirectUri,
  urlSlugToPlatform,
  MissingAdPlatformConfigError,
} from "@/lib/ad-platforms";
import { createOAuthState } from "@/lib/ad-platforms/oauth-state";
import { getAppBaseUrl } from "@/lib/ad-platforms/config";
import { getStorePlan } from "@/modules/subscriptions/services/subscription-service";

/** Starts the OAuth flow: redirects the merchant to Google/Meta/TikTok's consent screen. */
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

  try {
    const { store } = await getCurrentStore();
    if (!(await getStorePlan(store.id)).limits.ads) {
      dashboardUrl.searchParams.set("error", "upgrade_required");
      return NextResponse.redirect(dashboardUrl);
    }
    const state = createOAuthState(store.id);
    const adapter = getAdapter(platform);
    const authorizeUrl = adapter.getAuthorizeUrl(state, getRedirectUri(platform));
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof MissingAdPlatformConfigError) {
      dashboardUrl.searchParams.set("error", `${platformSlug}_not_configured`);
      return NextResponse.redirect(dashboardUrl);
    }
    console.error(`Ad platform connect init failed (${platformSlug})`, error);
    dashboardUrl.searchParams.set("error", `${platformSlug}_connect_failed`);
    return NextResponse.redirect(dashboardUrl);
  }
}
