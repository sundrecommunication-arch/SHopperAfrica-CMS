import "server-only";
import type { AdPlatform } from "./types";

/**
 * Shopper is registered as ONE OAuth app with each ad platform; every
 * merchant's "Connect" click authorizes that one app to read their own ad
 * account (the standard multi-tenant SaaS OAuth pattern). These env vars are
 * that app's own credentials — never per-merchant. See .env.example for
 * where to get each one; until they're set, connecting that platform will
 * fail with a clear error rather than silently doing nothing.
 */

class MissingAdPlatformConfigError extends Error {}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new MissingAdPlatformConfigError(
      `${name} is not set — see .env.example for how to get it before connecting this platform.`
    );
  }
  return value;
}

export function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function getRedirectUri(platform: AdPlatform): string {
  return `${getAppBaseUrl()}/api/integrations/${platformToUrlSlug(platform)}/callback`;
}

export function platformToUrlSlug(platform: AdPlatform): string {
  switch (platform) {
    case "GOOGLE_ADS":
      return "google-ads";
    case "META":
      return "meta";
    case "TIKTOK":
      return "tiktok";
  }
}

export function urlSlugToPlatform(slug: string): AdPlatform | null {
  switch (slug) {
    case "google-ads":
      return "GOOGLE_ADS";
    case "meta":
      return "META";
    case "tiktok":
      return "TIKTOK";
    default:
      return null;
  }
}

export const googleAdsConfig = {
  get clientId() {
    return required("GOOGLE_ADS_CLIENT_ID");
  },
  get clientSecret() {
    return required("GOOGLE_ADS_CLIENT_SECRET");
  },
  // Account-wide token for the Google Ads API itself (separate from the OAuth
  // client) — Google approves this for real ("Basic access") traffic beyond
  // your own test accounts; test-account access works immediately.
  get developerToken() {
    return required("GOOGLE_ADS_DEVELOPER_TOKEN");
  },
};

export const metaAdsConfig = {
  get appId() {
    return required("META_APP_ID");
  },
  get appSecret() {
    return required("META_APP_SECRET");
  },
};

export const tiktokAdsConfig = {
  get appId() {
    return required("TIKTOK_APP_ID");
  },
  get appSecret() {
    return required("TIKTOK_APP_SECRET");
  },
};

export { MissingAdPlatformConfigError };
