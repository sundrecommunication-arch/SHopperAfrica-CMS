// Visitor's cookie choice for Shopper's own marketing pages (NDPA-style
// opt-in for advertising/analytics cookies). Stored as a first-party cookie
// so the server (proxy, signup route) can respect it too.
// Edge-safe and client-safe: no imports.

export const CONSENT_COOKIE = "shopper_consent";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export type ConsentValue = "granted" | "denied";

export function parseConsent(value: string | undefined | null): ConsentValue | null {
  return value === "granted" || value === "denied" ? value : null;
}
