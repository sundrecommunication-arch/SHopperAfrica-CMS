import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CheckCircle2,
  CreditCard,
  Globe,
  Languages,
  MapPin,
  MessageCircle,
  Percent,
  Store,
  Tag,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { RememberCountry } from "@/components/marketing/remember-country";
import { COUNTRY_PAGES, getCountryPage } from "@/modules/marketing/international";
import { PLANS, PLAN_ORDER, formatPlanPrice } from "@/modules/subscriptions/plans";

export function generateStaticParams() {
  return COUNTRY_PAGES.map((c) => ({ country: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ country: string }> }): Promise<Metadata> {
  const page = getCountryPage((await params).country);
  if (!page) return {};
  const price = formatPlanPrice(PLANS.STARTER, page.currency);
  const title = `Sell online ${page.inName}: your own store from ${price}/month`;
  const description = `Open an online store ${page.inName} in minutes. Take card payments into your own Stripe account, add ${page.currency === "GBP" ? "VAT" : "sales tax"}, deliver anywhere. Free to start, paid plans from ${price} a month.`;
  return {
    title,
    description,
    alternates: { canonical: `/sell-online/${page.slug}` },
    openGraph: { title, description },
  };
}

export default async function SellOnlinePage({ params }: { params: Promise<{ country: string }> }) {
  const page = getCountryPage((await params).country);
  if (!page) notFound();

  const starter = formatPlanPrice(PLANS.STARTER, page.currency);
  const business = formatPlanPrice(PLANS.BUSINESS, page.currency);

  const FEATURES = [
    {
      icon: CreditCard,
      title: "Card payments, straight to you",
      body: "Connect your own Stripe account and customers pay by card, Apple Pay or Google Pay. The money goes to your Stripe balance and your bank. Shopper takes no cut of your sales.",
    },
    { icon: Percent, title: page.currency === "GBP" ? "VAT handled" : "Sales tax handled", body: page.tax },
    {
      icon: Truck,
      title: "Delivery your way",
      body: `Set delivery fees (${page.couriers}, local courier or collection), with free delivery above an amount you choose. Checkout asks for ${page.postcode}.`,
    },
    {
      icon: MessageCircle,
      title: "WhatsApp orders too",
      body: "Many of your customers already message you. Let them order on WhatsApp with a ready-made order message, alongside card checkout.",
    },
    {
      icon: Languages,
      title: "Speak your customers' language",
      body: "Your storefront in English, French, Portuguese, Swahili, Hausa, Yoruba, Igbo or Arabic.",
    },
    {
      icon: Globe,
      title: "Your own brand",
      body: "Your logo, colours and your own domain (www.yourshop.com) on Starter. Discount codes, abandoned-cart reminders, a blog and SEO built in.",
    },
  ];

  const STEPS = [
    { icon: Store, title: "Create your free store", body: `Sign up, choose ${page.name} as your country, and your prices are in ${page.symbol} with tax set up for you.` },
    { icon: Tag, title: "Add your products", body: "Photos, prices, sizes and colours. Import a spreadsheet if you have a lot." },
    { icon: CreditCard, title: "Connect Stripe", body: "Paste a key from your Stripe account (we show you exactly where to find it). Card payments switch on straight away." },
    { icon: MapPin, title: "Share your link", body: "On Instagram, TikTok, WhatsApp status and in your community groups. Orders land in your dashboard and inbox." },
  ];

  const FAQS = [
    {
      q: `How much does Shopper cost ${page.inName}?`,
      a: `Shopper is free to start, with up to 25 products. Starter is ${starter} a month (card payments, 200 products, your own domain) and Business is ${business} a month (unlimited products and team members). No contract, no setup fee.`,
    },
    {
      q: "Does Shopper take a cut of my sales?",
      a: "No. Card payments go straight into your own Stripe account. You only pay Stripe's standard card processing fee, which Stripe charges you directly.",
    },
    {
      q: "Do I need a Stripe account?",
      a: "Yes, for card payments. It's free to open at stripe.com: you add your business and bank details there, then paste one key into Shopper. Until then you can still take orders by bank transfer or on WhatsApp.",
    },
    {
      q: page.currency === "GBP" ? "Can Shopper add VAT to my orders?" : "Can Shopper add sales tax to my orders?",
      a: `${page.tax} You choose the rate; if you're unsure what applies to you, ask your accountant.`,
    },
    {
      q: "Can I sell African fashion, food and beauty products?",
      a: "Yes. Shopper was built with African businesses and works for ankara and aso-oke, jewellery, hair and skincare, foodstuff and more. Sell to your community and to everyone else.",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <RememberCountry code={page.code} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />

      <Reveal className="mx-auto max-w-3xl text-center">
        <span className="text-sm font-semibold uppercase tracking-wide text-primary">Selling {page.inName}</span>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl" style={{ fontFamily: "var(--font-marketing-display)" }}>
          Your own online store, from {starter} a month.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          For small businesses in {page.cities}. Take card payments into your own Stripe account, add{" "}
          {page.currency === "GBP" ? "VAT" : "tax"}, deliver anywhere, and keep every sale. Start free.
        </p>
        <div className="mx-auto mt-8 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="h-12 text-base sm:h-10">
            <Link href="/signup">Create your free store</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 text-base sm:h-10">
            <Link href={`/pricing?currency=${page.currency}`}>See pricing in {page.symbol}</Link>
          </Button>
        </div>
      </Reveal>

      {/* Worked example */}
      <Reveal className="mx-auto mt-14 max-w-md rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold">Example: an ankara two-piece set at {page.examplePrice}</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {[
            "Customer pays by card on your store",
            "The money goes to your Stripe account",
            "Shopper takes nothing from the sale",
            "Your order email arrives with their address",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {line}
            </li>
          ))}
        </ul>
      </Reveal>

      <section className="mt-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl" style={{ fontFamily: "var(--font-marketing-display)" }}>
          Everything you need to sell {page.inName}
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4 rounded-2xl border p-6">
              <f.icon className="size-6 shrink-0 text-primary" />
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl" style={{ fontFamily: "var(--font-marketing-display)" }}>
          Up and running in an afternoon
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <div className="h-full rounded-2xl border p-6">
                <s.icon className="size-6 text-primary" />
                <h3 className="mt-3 font-semibold">{i + 1}. {s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl" style={{ fontFamily: "var(--font-marketing-display)" }}>
          Simple monthly pricing in {page.symbol}
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {PLAN_ORDER.map((key) => {
            const plan = PLANS[key];
            return (
              <div key={key} className={`rounded-2xl border p-6 ${key === "STARTER" ? "border-primary ring-1 ring-primary" : ""}`}>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">{plan.name}</p>
                <p className="mt-2">
                  <span className="text-3xl font-semibold">{formatPlanPrice(plan, page.currency)}</span>
                  <span className="text-sm text-muted-foreground"> / month</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href={`/pricing?currency=${page.currency}`} className="text-primary underline underline-offset-2">
            Compare plans
          </Link>
        </p>
      </section>

      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ fontFamily: "var(--font-marketing-display)" }}>
          Questions
        </h2>
        <div className="mt-6 divide-y rounded-2xl border">
          {FAQS.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="cursor-pointer list-none font-medium marker:hidden">
                <span className="flex items-center justify-between gap-3">
                  {f.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <Reveal className="mt-20 rounded-2xl bg-primary/5 p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ fontFamily: "var(--font-marketing-display)" }}>
          Your store could be live today.
        </h2>
        <p className="mt-3 text-muted-foreground">Free to start. Paid plans from {starter} a month. No cut of your sales.</p>
        <Button asChild size="lg" className="mt-6 h-12 text-base sm:h-10">
          <Link href="/signup">Create your free store</Link>
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          Also selling from{" "}
          {COUNTRY_PAGES.filter((c) => c.slug !== page.slug).map((c, i) => (
            <span key={c.slug}>
              {i > 0 && " or "}
              <Link href={`/sell-online/${c.slug}`} className="underline underline-offset-2">
                {c.name === "United States" ? "the US" : c.name === "United Kingdom" ? "the UK" : c.name}
              </Link>
            </span>
          ))}
          ?
        </p>
      </Reveal>
    </div>
  );
}
