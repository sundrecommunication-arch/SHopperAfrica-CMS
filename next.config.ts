import type { NextConfig } from "next";

// Security headers applied to every response. Kept pragmatic rather than
// maximally strict: Shopper renders inline JSON-LD <script> tags (SEO) and
// relies on Next.js's own inline hydration scripts, so script-src needs
// 'unsafe-inline' unless/until we move to a nonce-based CSP (more work:
// requires generating a per-request nonce in middleware and threading it
// through every <script> tag). This still meaningfully blocks third-party
// script/style injection, clickjacking, MIME-sniffing, and leaks less
// referrer data than the default.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://*.supabase.co https://images.unsplash.com https://www.facebook.com",
  "connect-src 'self' https://www.google-analytics.com https://www.facebook.com",
  "frame-src 'self' https://checkout.paystack.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Product/category images are uploaded to Supabase Storage (see .env.example).
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
