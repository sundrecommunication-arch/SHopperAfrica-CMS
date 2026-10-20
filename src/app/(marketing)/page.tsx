import Link from "next/link";
import { MARKETS } from "@/modules/marketing/international";
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
  Boxes,
  Truck,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { HeroCarousel } from "@/components/marketing/hero-carousel";

export const metadata: Metadata = {
  title: "A free-to-start e-commerce website builder for businesses worldwide",
  alternates: { canonical: "/" },
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
  { icon: Boxes, title: "Dropship without stock", body: "Add products from trusted Nigerian suppliers in one tap. They deliver; your profit is paid to you automatically." },
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
      <section className="relative isolate flex min-h-[560px] items-center overflow-hidden pb-16 pt-12 sm:min-h-[720px] sm:py-28">
        <HeroCarousel />
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-5 px-5 text-center sm:gap-6 sm:px-6">
          <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/90 px-3 py-1 text-xs font-medium text-neutral-800 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Free to start · Stripe &amp; Paystack<span className="hidden sm:inline"> payments · Worldwide</span>
          </span>
          <h1
            className="animate-fade-up text-[2.15rem] font-semibold leading-[1.1] tracking-tight text-white min-[400px]:text-4xl sm:text-6xl"
            style={{ fontFamily: "var(--font-marketing-display)", animationDelay: "0.1s" }}
          >
            The free way for any business to sell online, anywhere.
          </h1>
          <p
            className="animate-fade-up max-w-2xl text-base text-white/85 sm:text-xl"
            style={{ animationDelay: "0.2s" }}
          >
            {/* Shorter on phones so the sign-up button stays on the first screen. */}
            Shopper is an e-commerce website you can start for free
            <span className="hidden sm:inline">
              {" "}— a real alternative to every other online store builder —
            </span>{" "}
            with a storefront, card payments through Stripe or Paystack, and a website Google can actually find
            <span className="hidden sm:inline">, so your business shows up everywhere your customers already are</span>.
          </p>
          <div
            className="animate-fade-up flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row"
            style={{ animationDelay: "0.3s" }}
          >
            <Button asChild size="lg" className="h-12 text-base sm:h-10">
              <Link href="/signup">Create your free store</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 text-base sm:h-10">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Countries */}
      <section className="border-b border-border/70 bg-muted/30 py-12 sm:py-16">
        <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <span className="text-sm font-semibold uppercase tracking-wide text-primary">Sell worldwide</span>
              <h2
                className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
                style={{ fontFamily: "var(--font-marketing-display)" }}
              >
                One store. Paid by Stripe or Paystack. Anywhere.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Pick your country and Shopper sets up your currency, payments, tax and addresses for you: Stripe in the
                UK, US and Canada, Paystack in Nigeria, Ghana and Kenya, and PayDunya mobile money in Benin. Plans from
                £5 a month.
              </p>
            </div>
            <Link href="/sell-online" className="shrink-0 text-sm font-semibold text-primary underline underline-offset-4">
              See all countries →
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {MARKETS.map((m) => (
              <Link
                key={m.code}
                href={m.href}
                className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium transition-colors hover:border-primary"
              >
                <span aria-hidden>{m.flag}</span>
                {m.name}
                <span className="text-xs font-normal text-muted-foreground">{m.currency}</span>
              </Link>
            ))}
          </div>
        </Reveal>
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

      {/* Dropshipping */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <Reveal className="grid items-center gap-8 rounded-3xl border border-border bg-card p-6 sm:p-10 md:grid-cols-2 md:gap-12">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Boxes className="h-3.5 w-3.5" /> New: Dropshipping
            </span>
            <h2
              className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ fontFamily: "var(--font-marketing-display)" }}
            >
              No stock? Sell anyway.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Pick products from approved Nigerian suppliers, set your price, and share your store. When a customer pays,
              the supplier delivers and your profit lands in your bank — automatically. Works on the free plan.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 text-base sm:h-10">
                <Link href="/dropshipping">How dropshipping works</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 text-base sm:h-10">
                <Link href="/suppliers">Become a supplier</Link>
              </Button>
            </div>
          </div>
          <ul className="space-y-4">
            {[
              { icon: Boxes, title: "One-tap products", body: "Photos, descriptions and stock are copied into your store for you." },
              { icon: Truck, title: "Delivered in days", body: "Suppliers ship from within Nigeria — no 4-week waits, no customs." },
              { icon: Wallet, title: "Paid automatically", body: "Paystack splits every payment: supplier gets their price, you get the rest." },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* Free to start */}
      <section className="border-y border-border/70 bg-primary/5 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1687422808384-c896d0efd4ab?q=80&w=1200&auto=format&fit=crop"
                alt="A confident small business owner standing at her shop with her phone"
                width={1200}
                height={900}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <span className="text-sm font-semibold uppercase tracking-wide text-primary">Free to start</span>
              <h2
                className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
                style={{ fontFamily: "var(--font-marketing-display)" }}
              >
                Start free. Pay only when your business is ready to grow.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Other e-commerce website builders charge monthly fees from day one, and still need a
                developer every time something changes. With Shopper you open your store, list up to
                25 products and take WhatsApp, bank transfer and cash-on-delivery orders for free —
                no card required. When you want card payments, your own domain or a team, plans
                start at £5, $6 or ₦10,000 a month.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Already selling on WordPress, Wix, Bumpa, Shopify, or any other e-commerce website
                builder? Shopper is a simpler alternative to all of them — moving over costs nothing,
                and you only pay for a plan when you need the extras. No plugins, no developer.
              </p>
              <ul className="mt-6 space-y-2">
                {["No setup fees", "Free plan, no card required", "No developer needed"].map((item) => (
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
        <Reveal className="rounded-3xl border border-border bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
          <h2
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-marketing-display)" }}
          >
            Start selling online today — for free.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
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
