import "server-only";
import type { AdPlatformAdapter, OAuthTokens } from "./types";
import { metaAdsConfig } from "./config";

// Meta Marketing API (Facebook & Instagram ads share one API). Requires the
// Meta app to pass App Review for the `ads_read` permission before it can
// read a real merchant's account — that review is the long pole here, not
// the code. Graph API version pinned below; Meta deprecates versions on a
// published schedule, so bump it if requests start failing.
const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const metaAdsAdapter: AdPlatformAdapter = {
  platform: "META",

  getAuthorizeUrl(state, redirectUri) {
    const params = new URLSearchParams({
      client_id: metaAdsConfig.appId,
      redirect_uri: redirectUri,
      scope: "ads_read,business_management",
      state,
    });
    return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
  },

  async exchangeCode(code, redirectUri) {
    const params = new URLSearchParams({
      client_id: metaAdsConfig.appId,
      client_secret: metaAdsConfig.appSecret,
      redirect_uri: redirectUri,
      code,
    });
    const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Meta token exchange failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();

    // Exchange the short-lived token for a long-lived one (~60 days) so
    // merchants don't have to reconnect constantly. Meta doesn't issue a
    // refresh token the way Google/TikTok do — the long-lived access token
    // IS the thing that gets renewed (see refreshTokens below).
    const longLived = await exchangeForLongLivedToken(data.access_token);
    return longLived;
  },

  async refreshTokens(refreshToken) {
    // Meta has no separate refresh token — re-exchanging a still-valid
    // long-lived token for a fresh one extends it another ~60 days. If the
    // token has already expired this fails and the merchant needs to
    // reconnect (status flips to NEEDS_REAUTH — see syncAdMetrics.ts).
    return exchangeForLongLivedToken(refreshToken);
  },

  async fetchAccountInfo(tokens) {
    const params = new URLSearchParams({
      fields: "id,name,account_id,currency",
      access_token: tokens.accessToken,
    });
    const res = await fetch(`${GRAPH_BASE}/me/adaccounts?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Meta adaccounts lookup failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const account = data.data?.[0];
    if (!account) {
      throw new Error("No ad accounts found for this Meta login.");
    }
    return {
      externalAccountId: account.id, // already in "act_<id>" form
      accountName: account.name ?? null,
      currency: account.currency ?? null,
    };
  },

  async fetchDailyMetrics(tokens, externalAccountId, range) {
    const params = new URLSearchParams({
      fields: "impressions,clicks,spend",
      time_range: JSON.stringify({ since: range.from, until: range.to }),
      time_increment: "1",
      access_token: tokens.accessToken,
    });
    const res = await fetch(`${GRAPH_BASE}/${externalAccountId}/insights?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Meta insights query failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const rows: Array<{
      date_start: string;
      impressions?: string;
      clicks?: string;
      spend?: string;
    }> = data.data ?? [];

    return rows.map((row) => ({
      date: row.date_start,
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      spend: Number(row.spend ?? 0),
      conversions: 0, // conversions need the `actions` field parsed by action_type — add once you know which events to count (purchase, lead, etc.)
    }));
  },
};

async function exchangeForLongLivedToken(shortLivedToken: string): Promise<OAuthTokens> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: metaAdsConfig.appId,
    client_secret: metaAdsConfig.appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Meta long-lived token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.access_token, // stored as "refreshToken" so refreshTokens() has something to re-exchange
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
  };
}
