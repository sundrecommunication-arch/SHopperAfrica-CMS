import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory, per-instance rate limiter for Shopper's most sensitive routes
 * (auth, signup, payments, checkout). This is intentionally simple rather
 * than Redis-backed: Shopper currently runs as a single Railway instance
 * with no autoscaling, so in-memory state is accurate. If Shopper ever
 * moves to multiple instances/autoscaling, this stops being accurate per
 * client (each instance tracks its own counts) and should be swapped for a
 * shared store (e.g. Upstash Redis + @upstash/ratelimit).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const RULES: Array<{ prefix: string; limit: number; windowMs: number }> = [
  { prefix: "/api/signup", limit: 10, windowMs: 60_000 },
  { prefix: "/api/storefront/auth", limit: 10, windowMs: 60_000 },
  { prefix: "/api/auth/forgot-password", limit: 5, windowMs: 60_000 },
  { prefix: "/api/auth/reset-password", limit: 5, windowMs: 60_000 },
  { prefix: "/api/payments/initialize", limit: 20, windowMs: 60_000 },
  { prefix: "/api/payments/verify", limit: 20, windowMs: 60_000 },
  { prefix: "/api/storefront/orders", limit: 20, windowMs: 60_000 },
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rule = RULES.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return NextResponse.next();

  cleanupExpired();

  const ip = getClientIp(request);
  const key = `${rule.prefix}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return NextResponse.next();
  }

  if (bucket.count >= rule.limit) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  bucket.count += 1;
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/signup",
    "/api/storefront/auth/:path*",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/payments/initialize",
    "/api/payments/verify",
    "/api/storefront/orders",
    "/login",
    "/signup",
  ],
};
