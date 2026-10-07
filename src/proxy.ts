import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE,
  attributionFromRequest,
} from "@/lib/attribution";

// Next.js renamed the "middleware" file convention to "proxy" — this runs on
// the server before a route renders. It does three unrelated jobs, all
// cheap to combine into one file since Next.js only allows one:
//   1. Redirect the bare apex domain (shopperafrica.com) to www. Both are
//      still pointed at this same app in DNS, so without this, a visitor who
//      lands on the apex domain gets a session cookie scoped to apex — which
//      breaks sign-in once NextAuth sends them to www (AUTH_URL in
//      auth.config.ts always builds its redirects against www).
//   2. Gate /dashboard and /onboarding behind a logged-in session.
//   3. Rate limit a handful of sensitive, unauthenticated API routes
//      (signup, login, password reset, payments, checkout, invites) so one
//      IP can't hammer them.
const { auth } = NextAuth(authConfig);

const CANONICAL_HOST = "www.shopperafrica.com";
const APEX_HOST = "shopperafrica.com";

/**
 * In-memory, per-instance rate limiter. Intentionally simple rather than
 * Redis-backed: Shopper currently runs as a single Railway instance with no
 * autoscaling, so in-memory state is accurate. If Shopper ever moves to
 * multiple instances/autoscaling, this stops being accurate per client (each
 * instance tracks its own counts) and should be swapped for a shared store
 * (e.g. Upstash Redis + @upstash/ratelimit).
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const RATE_LIMIT_RULES: Array<{ prefix: string; limit: number; windowMs: number }> = [
  { prefix: "/api/signup", limit: 10, windowMs: 60_000 },
  { prefix: "/api/storefront/auth", limit: 10, windowMs: 60_000 },
  { prefix: "/api/auth/forgot-password", limit: 5, windowMs: 60_000 },
  { prefix: "/api/auth/reset-password", limit: 5, windowMs: 60_000 },
  { prefix: "/api/payments/initialize", limit: 20, windowMs: 60_000 },
  { prefix: "/api/payments/verify", limit: 20, windowMs: 60_000 },
  { prefix: "/api/storefront/orders", limit: 20, windowMs: 60_000 },
  { prefix: "/api/invites", limit: 20, windowMs: 60_000 },
  { prefix: "/login", limit: 15, windowMs: 60_000 },
  { prefix: "/signup", limit: 15, windowMs: 60_000 },
];

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Opportunistic cleanup so the Map doesn't grow unbounded between restarts.
let lastCleanup = Date.now();
function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

function checkRateLimit(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const rule = RATE_LIMIT_RULES.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return null;

  cleanupExpired();

  const ip = getClientIp(request);
  const key = `${rule.prefix}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return null;
  }

  if (bucket.count >= rule.limit) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  bucket.count += 1;
  return null;
}

export function proxy(request: NextRequest) {
  // x-forwarded-host is what Railway's proxy sets to the domain the visitor
  // actually typed; raw "host" is the fallback for any environment without
  // a proxy in front (e.g. running `next start` directly).
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host === APEX_HOST) {
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${CANONICAL_HOST}`);
    // 308 (not 301/302) so a POST to e.g. /api/storefront/orders stays a
    // POST after the redirect instead of silently becoming a GET.
    return NextResponse.redirect(url, 308);
  }

  const limited = checkRateLimit(request);
  if (limited) return limited;

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/admin")
  ) {
    // @ts-expect-error - next-auth's `auth` wrapper accepts the proxy/middleware request shape
    return auth(request);
  }

  return withAttribution(request, NextResponse.next());
}

// Paths that are Shopper's own marketing/auth pages. Merchants' storefronts
// (/store/...) are deliberately excluded: their shoppers aren't Shopper leads.
const NON_MARKETING_PREFIXES = ["/store/", "/api/", "/dashboard", "/admin", "/onboarding", "/invite/"];

/**
 * Records the latest campaign touch (utm_*, ad click ids, or an external
 * referrer) in a first-party cookie so signup can attribute the new merchant.
 * Direct visits leave an existing cookie alone.
 */
function withAttribution(request: NextRequest, response: NextResponse) {
  const { pathname } = request.nextUrl;
  if (request.method !== "GET" || NON_MARKETING_PREFIXES.some((p) => pathname.startsWith(p))) {
    return response;
  }
  const attribution = attributionFromRequest(
    request.nextUrl,
    request.headers.get("referer"),
    request.headers.get("x-forwarded-host") ?? request.nextUrl.hostname
  );
  if (attribution) {
    response.cookies.set(ATTRIBUTION_COOKIE, JSON.stringify(attribution), {
      maxAge: ATTRIBUTION_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  return response;
}

export const config = {
  // Broadened from a specific path list to everything except Next's own
  // static/image assets and favicon — the apex→www redirect above has to
  // apply to every route, not just the ones rate-limited or auth-gated
  // below (those are still filtered inside proxy() itself, so this doesn't
  // change their behavior).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
