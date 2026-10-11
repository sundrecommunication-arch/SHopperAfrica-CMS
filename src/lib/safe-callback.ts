/**
 * The ?callbackUrl= a login/signup page was opened with (NextAuth adds it
 * when bouncing someone from a protected page), if it's a same-site path.
 * Absolute or protocol-relative URLs are ignored so the link can't send
 * people to another site after they sign in.
 */
export function getSafeCallbackPath(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("callbackUrl");
  if (!raw) return null;
  let path = raw;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    path = url.pathname + url.search;
  } catch {
    return null;
  }
  return path.startsWith("/") && !path.startsWith("//") ? path : null;
}
