import type { MetadataRoute } from "next";

/**
 * Auto-generated robots.txt (Next's native App Router convention, served at
 * /robots.txt). Storefronts are crawlable by default with no setup; only
 * account/dashboard/auth routes and API endpoints are kept out of the index.
 *
 * Explicitly allowing the AI answer/generative-engine crawlers (GPTBot,
 * Google-Extended, PerplexityBot, ClaudeBot, ...) is the GEO half of "zero
 * effort" SEO — a lot of sites accidentally block these, which keeps them
 * out of ChatGPT/Perplexity/AI Overviews answers even though they're happy
 * to be found on Google.
 */
export default function robots(): MetadataRoute.Robots {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const disallow = ["/dashboard", "/api", "/login", "/signup", "/onboarding"];

  const aiCrawlers = [
    "GPTBot",
    "ChatGPT-User",
    "Google-Extended",
    "PerplexityBot",
    "ClaudeBot",
    "Claude-Web",
    "anthropic-ai",
    "CCBot",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...aiCrawlers.map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
