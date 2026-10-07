// Where a merchant came from when they signed up (Instagram, TikTok, a Meta
// ad, Google, a partner...). The proxy records the latest campaign touch in
// a first-party cookie while someone browses the marketing site; the signup
// route copies it onto the new user. No third-party service involved.
// Edge-safe: imported by src/proxy.ts.

export const ATTRIBUTION_COOKIE = "shopper_attr";
export const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface Attribution {
  source: string; // e.g. "instagram", "meta", "google", "partner-ada", or a referrer host
  medium?: string; // e.g. "social", "paid", "referral", "organic"
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landingPath?: string;
  at: string; // ISO time of the touch
}

const SEARCH_ENGINES = ["google.", "bing.", "yahoo.", "duckduckgo.", "yandex."];

const clean = (v: string | null) => (v ? v.trim().toLowerCase().slice(0, 100) : undefined);

/**
 * Builds an attribution record from a landing URL + Referer header, or null
 * when the visit carries no campaign info (direct / internal navigation).
 */
export function attributionFromRequest(url: URL, referer: string | null, ownHost: string): Attribution | null {
  const p = url.searchParams;
  const utmSource = clean(p.get("utm_source"));
  if (utmSource) {
    return {
      source: utmSource,
      medium: clean(p.get("utm_medium")),
      campaign: clean(p.get("utm_campaign")),
      content: clean(p.get("utm_content")),
      term: clean(p.get("utm_term")),
      referrer: referer ?? undefined,
      landingPath: url.pathname,
      at: new Date().toISOString(),
    };
  }
  // Ad clicks that arrive without UTMs still carry the platform's click id.
  if (p.get("fbclid")) {
    return { source: "facebook", medium: "social", landingPath: url.pathname, at: new Date().toISOString() };
  }
  if (p.get("gclid")) {
    return { source: "google", medium: "paid", landingPath: url.pathname, at: new Date().toISOString() };
  }

  if (referer) {
    try {
      const host = new URL(referer).hostname.replace(/^www\./, "");
      const own = ownHost.split(":")[0].replace(/^www\./, "");
      if (host && host !== own) {
        const isSearch = SEARCH_ENGINES.some((s) => host.includes(s));
        return {
          source: isSearch ? host.split(".")[0] : host,
          medium: isSearch ? "organic" : "referral",
          referrer: referer,
          landingPath: url.pathname,
          at: new Date().toISOString(),
        };
      }
    } catch {
      // malformed Referer -- ignore
    }
  }
  return null;
}

export function parseAttributionCookie(value: string | undefined): Attribution | null {
  if (!value) return null;
  try {
    // Next.js URL-encodes cookie values itself and decodes them on read.
    const parsed = JSON.parse(value);
    return parsed && typeof parsed.source === "string" ? (parsed as Attribution) : null;
  } catch {
    return null;
  }
}
