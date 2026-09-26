import "server-only";
import type { AdPlatformAdapter } from "./types";
import { tiktokAdsConfig } from "./config";

// TikTok for Business Marketing API. The app needs TikTok's developer
// approval (Marketing API access) before it can read a real advertiser's
// data — like Meta's App Review, that approval is the long pole, not this
// code. API version pinned below; bump it if TikTok deprecates it.
const API_VERSION = "v1.3";
const API_BASE = `https://business-api.tiktok.com/open_api/${API_VERSION}`;

export const tiktokAdsAdapter: AdPlatformAdapter = {
  platform: "TIKTOK",

  getAuthorizeUrl(state, redirectUri) {
    const params = new URLSearchParams({
      app_id: tiktokAdsConfig.appId,
      redirect_uri: redirectUri,
      state,
    });
    return `https://business-api.tiktok.com/portal/auth?${params.toString()}`;
  },

  async exchangeCode(code) {
    // TikTok's token endpoint doesn't take redirect_uri — the auth_code
    // alone (matched against the app config) is enough.
    const res = await fetch(`${API_BASE}/oauth2/access_token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: tiktokAdsConfig.appId,
        secret: tiktokAdsConfig.appSecret,
        auth_code: code,
      }),
    });
    if (!res.ok) {
      throw new Error(`TikTok token exchange failed: ${res.status} ${await res.text()}`);
    }
    const body = await res.json();
    const data = body.data ?? {};
    return {
      accessToken: data.access_token,
      // TikTok's access token is itself long-lived (no separate refresh
      // flow in the standard Marketing API) — stored as both so the shared
      // adAccountConnections shape (access + refresh) still fits.
      refreshToken: data.access_token ?? null,
      expiresAt: null,
    };
  },

  async refreshTokens(refreshToken) {
    // No refresh endpoint to call — the "refresh token" here IS the access
    // token TikTok already treats as long-lived, so just pass it through.
    return { accessToken: refreshToken, refreshToken, expiresAt: null };
  },

  async fetchAccountInfo(tokens) {
    const res = await fetch(
      `${API_BASE}/oauth2/advertiser/get/?app_id=${encodeURIComponent(tiktokAdsConfig.appId)}&secret=${encodeURIComponent(tiktokAdsConfig.appSecret)}`,
      { headers: { "Access-Token": tokens.accessToken } }
    );
    if (!res.ok) {
      throw new Error(`TikTok advertiser lookup failed: ${res.status} ${await res.text()}`);
    }
    const body = await res.json();
    const advertiser = body.data?.list?.[0];
    if (!advertiser) {
      throw new Error("No TikTok advertiser accounts found for this login.");
    }
    return {
      externalAccountId: String(advertiser.advertiser_id),
      accountName: advertiser.advertiser_name ?? null,
      currency: advertiser.currency ?? null,
    };
  },

  async fetchDailyMetrics(tokens, externalAccountId, range) {
    const params = new URLSearchParams({
      advertiser_id: externalAccountId,
      report_type: "BASIC",
      dimensions: JSON.stringify(["stat_time_day"]),
      metrics: JSON.stringify(["impressions", "clicks", "spend", "conversion"]),
      data_level: "AUCTION_ADVERTISER",
      start_date: range.from,
      end_date: range.to,
      page_size: "1000",
    });
    const res = await fetch(`${API_BASE}/report/integrated/get/?${params.toString()}`, {
      headers: { "Access-Token": tokens.accessToken },
    });
    if (!res.ok) {
      throw new Error(`TikTok report query failed: ${res.status} ${await res.text()}`);
    }
    const body = await res.json();
    const rows: Array<{
      dimensions: { stat_time_day: string };
      metrics: { impressions?: string; clicks?: string; spend?: string; conversion?: string };
    }> = body.data?.list ?? [];

    return rows.map((row) => ({
      date: row.dimensions.stat_time_day.slice(0, 10),
      impressions: Number(row.metrics.impressions ?? 0),
      clicks: Number(row.metrics.clicks ?? 0),
      spend: Number(row.metrics.spend ?? 0),
      conversions: Number(row.metrics.conversion ?? 0),
    }));
  },
};
