export type AdPlatform = "GOOGLE_ADS" | "META" | "TIKTOK";

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  /** null means the platform didn't return an expiry (e.g. a long-lived token). */
  expiresAt: Date | null;
}

export interface AdAccountInfo {
  externalAccountId: string;
  accountName: string | null;
  currency: string | null;
}

export interface DailyMetric {
  date: string; // YYYY-MM-DD
  impressions: number;
  clicks: number;
  spend: number; // in the account's own currency, as a decimal (not micros/cents)
  conversions: number;
}

/**
 * One adapter per ad platform. Every method talks to that platform's real API
 * over plain fetch (no heavy SDKs) — see google-ads.ts / meta-ads.ts /
 * tiktok-ads.ts for the platform-specific request shapes. Written against
 * each platform's documented OAuth + reporting endpoints; because none of
 * this can be exercised without a real, approved developer app for that
 * platform, double-check the endpoint/version/field names against current
 * docs the first time you connect a real account.
 */
export interface AdPlatformAdapter {
  platform: AdPlatform;
  /** Builds the URL to send the merchant to for OAuth consent. */
  getAuthorizeUrl(state: string, redirectUri: string): string;
  /** Exchanges the OAuth `code` the platform redirected back with for tokens. */
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>;
  /** Refreshes an access token using a stored refresh token, if the platform supports it. */
  refreshTokens(refreshToken: string): Promise<OAuthTokens>;
  /** Looks up the ad account to connect (first/only account for v1 — see module docs). */
  fetchAccountInfo(tokens: OAuthTokens): Promise<AdAccountInfo>;
  /** Pulls per-day metrics for `externalAccountId` between the given dates (inclusive). */
  fetchDailyMetrics(
    tokens: OAuthTokens,
    externalAccountId: string,
    range: { from: string; to: string }
  ): Promise<DailyMetric[]>;
}
