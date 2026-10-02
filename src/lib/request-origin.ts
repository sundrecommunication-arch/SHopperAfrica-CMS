/**
 * Reconstructs the public-facing origin (scheme + host) a request actually
 * came in on.
 *
 * Shopper runs behind Railway's reverse proxy, which forwards every request
 * to the container's internal port without rewriting the Host header — so
 * `request.url` / the raw Host header the app sees always reads something
 * like "localhost:8080", never the real public domain the customer typed,
 * even for traffic arriving on the live domain. `x-forwarded-host` /
 * `x-forwarded-proto` are the headers the proxy sets correctly to carry the
 * original request's real host and protocol, so those are used first.
 * NEXT_PUBLIC_APP_URL is a fallback for a request with no proxy in front of
 * it (e.g. running `next start` directly), and the raw request URL is the
 * last resort.
 */
export function getPublicOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${forwardedProto}://${forwardedHost}`;
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  return new URL(request.url).origin;
}
