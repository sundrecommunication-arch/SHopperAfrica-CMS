import "server-only";
import type { AdPlatform, AdPlatformAdapter } from "./types";
import { googleAdsAdapter } from "./google-ads";
import { metaAdsAdapter } from "./meta-ads";
import { tiktokAdsAdapter } from "./tiktok-ads";

export function getAdapter(platform: AdPlatform): AdPlatformAdapter {
  switch (platform) {
    case "GOOGLE_ADS":
      return googleAdsAdapter;
    case "META":
      return metaAdsAdapter;
    case "TIKTOK":
      return tiktokAdsAdapter;
  }
}

export * from "./types";
export { platformToUrlSlug, urlSlugToPlatform, getRedirectUri, MissingAdPlatformConfigError } from "./config";
