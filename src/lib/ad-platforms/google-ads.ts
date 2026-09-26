import "server-only";
import type { AdPlatformAdapter } from "./types";
import { googleAdsConfig } from "./config";

// Google Ads API — OAuth via Google's standard endpoints, reporting via the
// Google Ads Query Language (GAQL). API version pinned below; Google retires
// old versions roughly yearly, so bump GOOGLE_ADS_API_VERSION if requests
// start failing with an "API version no longer supported" error.
const GOOGLE_ADS_API_VERSION = "v18";
const OAUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": googleAdsConfig.developerToken,
    "Content-Type": "application/json",
  };
}

export const googleAdsAdapter: AdPlatformAdapter = {
  platform: "GOOGLE_ADS",

  getAuthorizeUrl(state, redirectUri) {
    const params = new URLSearchParams({
      client_id: googleAdsConfig.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/adwords",
      access_type: "offline", // required to get a refresh token
      prompt: "consent", // forces a refresh token on every connect, not just the first
      state,
    });
    return `${OAUTH_BASE}?${params.toString()}`;
  },

  async exchangeCode(code, redirectUri) {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: googleAdsConfig.clientId,
        client_secret: googleAdsConfig.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) {
      throw new Error(`Google Ads token exchange failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
    };
  },

  async refreshTokens(refreshToken) {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: googleAdsConfig.clientId,
        client_secret: googleAdsConfig.clientSecret,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      throw new Error(`Google Ads token refresh failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken, // Google doesn't rotate the refresh token on a plain refresh
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
    };
  },

  async fetchAccountInfo(tokens) {
    // Lists customer ids the authorizing user can access. v1 takes the first
    // one — a merchant with multiple Google Ads accounts under one login
    // picks which to connect in a later version.
    const res = await fetch(`${API_BASE}/customers:listAccessibleCustomers`, {
      headers: authHeaders(tokens.accessToken),
    });
    if (!res.ok) {
      throw new Error(`Google Ads listAccessibleCustomers failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const resourceName: string | undefined = data.resourceNames?.[0];
    if (!resourceName) {
      throw new Error("No accessible Google Ads accounts found for this Google login.");
    }
    const customerId = resourceName.replace("customers/", "");

    const searchRes = await fetch(`${API_BASE}/customers/${customerId}/googleAds:search`, {
      method: "POST",
      headers: authHeaders(tokens.accessToken),
      body: JSON.stringify({
        query: "SELECT customer.descriptive_name, customer.currency_code FROM customer LIMIT 1",
      }),
    });
    const searchData = searchRes.ok ? await searchRes.json() : null;
    const customer = searchData?.results?.[0]?.customer;

    return {
      externalAccountId: customerId,
      accountName: customer?.descriptiveName ?? null,
      currency: customer?.currencyCode ?? null,
    };
  },

  async fetchDailyMetrics(tokens, externalAccountId, range) {
    const query = `
      SELECT segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
      FROM customer
      WHERE segments.date BETWEEN '${range.from}' AND '${range.to}'
    `.trim();

    const res = await fetch(`${API_BASE}/customers/${externalAccountId}/googleAds:search`, {
      method: "POST",
      headers: authHeaders(tokens.accessToken),
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      throw new Error(`Google Ads metrics query failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const rows: Array<{
      segments: { date: string };
      metrics: { impressions?: string; clicks?: string; costMicros?: string; conversions?: string };
    }> = data.results ?? [];

    return rows.map((row) => ({
      date: row.segments.date,
      impressions: Number(row.metrics.impressions ?? 0),
      clicks: Number(row.metrics.clicks ?? 0),
      spend: Number(row.metrics.costMicros ?? 0) / 1_000_000, // cost_micros -> currency units
      conversions: Number(row.metrics.conversions ?? 0),
    }));
  },
};
