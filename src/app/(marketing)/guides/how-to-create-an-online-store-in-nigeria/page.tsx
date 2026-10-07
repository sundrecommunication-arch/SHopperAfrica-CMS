import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { JsonLd } from "@/components/seo/json-ld";

const TITLE = "How to create an online store in Nigeria (2026 guide)";
const DESCRIPTION =
  "A step-by-step guide to opening an online store in Nigeria: choosing a platform, adding products, setting delivery fees, taking payments with Paystack and getting orders on WhatsApp.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guides/how-to-create-an-online-store-in-nigeria" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "article" },
};

const STEPS = [
  {
    title: "Decide what you'll sell first",
    body: "Start with your 5–10 best-selling products — the ones customers already ask about in your DMs. You can add the rest later. Good photos matter more than a big catalogue: shoot in daylight, on a plain background, from your phone.",
  },
  {
    title: "Choose a platform built for how you sell",
    body: "If most of your customers find you on Instagram and WhatsApp, pick a platform where orders can come back to WhatsApp, prices are in naira, and you don't need a developer. Shopper is free to start and built for exactly this; Shopify and Wix are powerful global options priced in dollars.",
  },
  {
    title: "Create your store and add products",
    body: "On Shopper: sign up, name your store, then add each product with a photo, price and description. If a product comes in sizes or colours, add them as options and set stock for each one so you never sell what you don't have.",
  },
  {
    title: "Set your delivery fees",
    body: "List the areas you deliver to with a fee for each — for example Lagos Island ₦3,000, Mainland ₦2,500, Abuja ₦5,000, Pickup free — and optionally free delivery above a certain order value. Customers choose at checkout and the total updates automatically.",
  },
  {
    title: "Decide how customers will pay",
    body: "Bank transfer and cash on delivery are the easiest place to start. When you're ready, connect a Paystack account so customers can pay by card, bank or USSD at checkout and every payment is confirmed automatically.",
  },
  {
    title: "Connect WhatsApp",
    body: "Add your WhatsApp number so customers can order through WhatsApp and you receive each order fully written out — items, delivery fee, total and address — instead of piecing it together from chats.",
  },
  {
    title: "Share your store link everywhere",
    body: "Put the link in your Instagram and TikTok bio, WhatsApp status and business profile. Reply to \"how much?\" with your store link instead of a price list.",
  },
  {
    title: "Get your first order — then grow",
    body: "Place a test order yourself, then share with your existing customers first. Once orders are flowing, add your own domain (e.g. www.yourbrand.com), run discount codes, and invite a team member to help.",
  },
];

const FAQS = [
  {
    q: "How much does it cost to create an online store in Nigeria?",
    a: "It can be free. Shopper's Free plan lets you list up to 25 products and take WhatsApp, bank transfer and cash-on-delivery orders at no cost. Paid plans with card payments and your own domain start at ₦10,000 per month.",
  },
  {
    q: "Do I need a website developer?",
    a: "No. With a store builder like Shopper you can set everything up from your phone in about 10 minutes — no code, plugins or hosting to manage.",
  },
  {
    q: "How do I receive payments from customers?",
    a: "Start with bank transfer and cash on delivery. To accept cards, connect your own Paystack account — payments go straight to your bank account and orders are marked paid automatically.",
  },
  {
    q: "Can I still sell on WhatsApp and Instagram?",
    a: "Yes — and you should. Your online store gives every chat a link to order from, and sends the order back to your WhatsApp.",
  },
];

export default function GuidePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: TITLE,
          description: DESCRIPTION,
          step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.body })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />

      <Reveal>
        <span className="text-sm font-semibold uppercase tracking-wide text-primary">Guide</span>
        <h1
          className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl"
          style={{ fontFamily: "var(--font-marketing-display)" }}
        >
          {TITLE}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Most Nigerian businesses start selling in Instagram DMs and WhatsApp chats. That works —
          until you&apos;re retyping price lists all day and losing orders in long threads. Here&apos;s how
          to open a proper online store in eight steps, without a developer.
        </p>
      </Reveal>

      <Reveal className="mt-12">
      <ol className="space-y-8">
        {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{s.title}</h2>
                <p className="mt-2 text-muted-foreground">{s.body}</p>
              </div>
            </li>
        ))}
      </ol>
      </Reveal>

      <Reveal className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
        <div className="mt-4 divide-y divide-border rounded-2xl border border-border">
          {FAQS.map((f) => (
            <div key={f.q} className="p-5">
              <h3 className="font-medium">{f.q}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-12 rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground">
        <h2 className="text-2xl font-semibold sm:text-3xl" style={{ fontFamily: "var(--font-marketing-display)" }}>
          Ready? Your store can be live in 10 minutes.
        </h2>
        <Button asChild size="lg" variant="secondary" className="mt-6">
          <Link href="/signup">Create your free store</Link>
        </Button>
        <p className="mt-4 text-sm text-primary-foreground/80">
          Comparing options?{" "}
          <Link href="/compare/shopper-vs-bumpa" className="underline">vs Bumpa</Link> ·{" "}
          <Link href="/compare/shopper-vs-shopify" className="underline">vs Shopify</Link> ·{" "}
          <Link href="/compare/shopper-vs-wix" className="underline">vs Wix</Link>
        </p>
      </Reveal>
    </article>
  );
}
