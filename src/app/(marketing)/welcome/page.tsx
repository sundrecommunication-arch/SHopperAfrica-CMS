import Link from "next/link";
import type { Metadata } from "next";
import {
  Search,
  Sparkles,
  Megaphone,
  Target,
  Radar,
  MessageCircle,
  ShoppingBag,
  Tag,
  Clock,
  BarChart3,
  Globe2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "A free website for every African business",
};

const AD_PLATFORMS = [
  {
    icon: Megaphone,
    name: "Google Ads",
    detail: "Won't approve a campaign without a real landing page URL to send clicks to.",
  },
  {
    icon: Target,
    name: "Meta Ads (Facebook & Instagram)",
    detail: "Rewards ads that link to an actual website with lower costs and a Quality Ranking boost.",
  },
  {
    icon: Radar,
    name: "TikTok Ads",
    detail: "Needs a destination link — a bio link or DM alone isn't enough to run paid traffic.",
  },
  {
    icon: MessageCircle,
    name: "WhatsApp Business",
    detail: "Works best paired with a catalog people can browse before they ever message you.",
  },
];

const VISIBILITY = [
  {
    icon: Search,
    title: "SEO",
    body: "Search Engine Optimization — showing up when someone Googles what you sell. Impossible without pages Google can crawl.",
  },
  {
    icon: Sparkles,
    title: "GEO",
    body: "Generative Engine Optimization — being the answer ChatGPT, Gemini, or Perplexity gives when someone asks for a business like yours.",
  },
  {
    icon: Globe2,
    title: "AEO",
    body: "Answer Engine Optimization — landing in the direct-answer box on Google, not buried in a list of links.",
  },
];

const FEATURES = [
  { icon: ShoppingBag, title: "Your own storefront", body: "A real online store with your name, your products, your brand — live in minutes." },
  { icon: MessageCircle, title: "Sell on WhatsApp or online", body: "Customers order however they prefer — straight to WhatsApp, or pay online with card and bank transfer." },
  { icon: Tag, title: "Discounts & promo codes", body: "Run sales and coupon codes whenever you want, no developer required." },
  { icon: Clock, title: "Abandoned cart recovery", body: "Shopper flags carts customers left unpaid so you can follow up on WhatsApp before you lose the sale." },
  { icon: BarChart3, title: "One dashboard for all your ads", body: "Connect Google, Meta, and TikTok Ads and see how every platform is actually performing, in one place." },
  { icon: Search, title: "Built-in SEO, automatically", body: "Every store ships with a sitemap and structured data out of the box — no plugins, no setup." },
  { icon: ShieldCheck, title: "Secure & reliable", body: "Your store, your data, hosted properly — not a WhatsApp status that disappears in 24 hours." },
  { icon: Globe2, title: "Bring your own domain", body: "Point yourname.com at your Shopper store whenever you're ready." },
];

export default function WelcomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/40 via-background to-background" />
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28">
          <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Free for African business owners
          </span>
          <h1
            className="animate-fade-up text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl"
            style={{ fontFamily: "var(--font-marketing-display)", animationDelay: "0.1s" }}
          >
            Every business deserves a home online.
          </h1>
          <p
            className="animate-fade-up max-w-2xl text-lg text-muted-foreground sm:text-xl"
            style={{ animationDelay: "0.2s" }}
          >
            Shopper gives you a real storefront, a checkout, and a website Google can actually find —
            free — so your business shows up everywhere your customers already are.
          </p>
          <div className="animate-fade-up flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "0.3s" }}>
            <Button asChild size="lg" className="text-base">
              <Link href="/signup">Create your free store</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* The problem */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <div className="order-2 md:order-1">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary">The problem</span>
            <h2
              className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ fontFamily: "var(--font-marketing-display)" }}
            >
              Running a business on WhatsApp alone is exhausting.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Every new customer means another DM to answer, another price list to retype, another
              screenshot to send. Ads you paid for get rejected because there&apos;s nowhere for
              people to land. And when someone searches your business name on Google, nothing
              comes up — because there&apos;s nothing to find.
            </p>
            <p className="mt-4 text-muted-foreground">
              None of that is a sign you&apos;re doing something wrong. It&apos;s a sign you&apos;re
              missing one thing every business — anywhere in the world — is expected to have: a
              website.
            </p>
          </div>
          <div className="order-1 overflow-hidden rounded-2xl border border-border shadow-sm md:order-2">
            <img
              src="https://images.unsplash.com/photo-1620809975674-10b8ff5f8e58?q=80&w=1200&auto=format&fit=crop"
              alt="A business owner looking stressed while working at a laptop"
              width={1200}
              height={900}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        </Reveal>
      </section>

      {/* Ad platforms need a website */}
      <section className="border-y border-border/70 bg-muted/30 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary">Why it matters</span>
            <h2
              className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ fontFamily: "var(--font-marketing-display)" }}
            >
              Every ad platform assumes you already have one.
            </h2>
            <p className="mt-4 text-muted-foreground">
              You can&apos;t out-advertise a missing website. Here&apos;s what actually stops your
              ad spend from working without one.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {AD_PLATFORMS.map((p, i) => (
              <Reveal key={p.name} delay={i * 80}>
                <div className="flex h-full gap-4 rounded-2xl border border-border bg-background p-6">
                  <p.icon className="h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{p.detail}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SEO / GEO / AEO */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-primary">Get found, everywhere</span>
          <h2
            className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-marketing-display)" }}
          >
            Visibility isn&apos;t optional anymore.
          </h2>
          <p className="mt-4 text-muted-foreground">
            How people discover businesses has split three ways — and all three need the same
            thing underneath: a real, indexable website. Every Shopper store ships with one
            automatically.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {VISIBILITY.map((v, i) => (
            <Reveal key={v.title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-border p-6 text-center">
                <v.icon className="mx-auto h-7 w-7 text-primary" />
                <h3 className="mt-3 font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Free for Africa */}
      <section className="border-y border-border/70 bg-primary/5 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1687422808384-c896d0efd4ab?q=80&w=1200&auto=format&fit=crop"
                alt="A confident African small business owner standing at her shop with her phone"
                width={1200}
                height={900}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <span className="text-sm font-semibold uppercase tracking-wide text-primary">No cost, no catch</span>
              <h2
                className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
                style={{ fontFamily: "var(--font-marketing-display)" }}
              >
                100% free for business owners across Africa.
              </h2>
              <p className="mt-4 text-muted-foreground">
                A custom website normally costs what most small businesses can&apos;t spare — and
                still needs a developer every time something changes. Shopper gives you the store,
                the checkout, and the visibility a website is supposed to bring, at no cost to
                start. No card required.
              </p>
              <ul className="mt-6 space-y-2">
                {["No setup fees", "No monthly charge to start", "No developer needed"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" className="mt-8">
                <Link href="/signup">Create your free store</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-primary">Everything included</span>
          <h2
            className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-marketing-display)" }}
          >
            More than a website.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 70}>
              <div className="h-full rounded-2xl border border-border p-6">
                <f.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-8 text-center">
          <Link href="/features" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
            See the full feature list →
          </Link>
        </Reveal>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 sm:pb-28">
        <Reveal className="rounded-3xl border border-border bg-foreground px-6 py-14 text-center text-background sm:px-12">
          <h2
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-marketing-display)" }}
          >
            Start selling online today — for free.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-background/70">
            It takes less time to set up your Shopper store than it does to answer your next
            WhatsApp message.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8 text-base">
            <Link href="/signup">Create your free store</Link>
          </Button>
        </Reveal>
      </section>
    </div>
  );
}
