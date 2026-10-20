import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { INTL_CURRENCIES, PLANS, PLAN_ORDER, formatPlanPrice, type IntlCurrency } from "@/modules/subscriptions/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start free. Paid plans from ₦10,000 a month in Nigeria, or from £5 / $6 / CA$8 a month in the UK, US and Canada.",
  alternates: { canonical: "/pricing" },
};

const CURRENCY_TABS: { code: "NGN" | IntlCurrency; label: string }[] = [
  { code: "NGN", label: "₦ Nigeria" },
  ...INTL_CURRENCIES.map((c) => ({ code: c.code, label: `${c.symbol} ${c.country}` })),
];

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ currency?: string }> }) {
  const requested = (await searchParams).currency?.toUpperCase();
  const currency = CURRENCY_TABS.find((t) => t.code === requested)?.code ?? "NGN";
  const overseas = currency !== "NGN";

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Start free — no card required
        </span>
        <h1
          className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl"
          style={{ fontFamily: "var(--font-marketing-display)" }}
        >
          Simple pricing that grows with you
        </h1>
        <p className="mt-4 text-muted-foreground">
          Open your store for free and start taking WhatsApp orders today. Upgrade when you&apos;re
          ready for card payments, your own domain or a team.
        </p>
      </Reveal>

      <nav aria-label="Currency" className="mx-auto mt-8 flex w-fit flex-wrap justify-center gap-1 rounded-full border p-1 text-sm">
        {CURRENCY_TABS.map((tab) => (
          <Link
            key={tab.code}
            href={tab.code === "NGN" ? "/pricing" : `/pricing?currency=${tab.code}`}
            scroll={false}
            aria-current={tab.code === currency ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 transition-colors ${
              tab.code === currency ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {PLAN_ORDER.map((key) => {
          const plan = PLANS[key];
          const featured = key === "STARTER";
          return (
            <Reveal
              key={key}
              className={`flex flex-col rounded-3xl border p-8 ${
                featured ? "border-primary ring-1 ring-primary" : "border-border"
              }`}
            >
              <span className="text-sm font-semibold uppercase tracking-wide text-primary">
                {plan.name}
              </span>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              <div className="mt-4">
                <span
                  className="text-4xl font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-marketing-display)" }}
                >
                  {formatPlanPrice(plan, currency)}
                </span>
                <span className="text-sm text-muted-foreground"> / month</span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>

              <Button asChild size="lg" variant={featured ? "default" : "outline"} className="mt-8">
                <Link href="/signup">{key === "FREE" ? "Create your free store" : `Start free, upgrade anytime`}</Link>
              </Button>
            </Reveal>
          );
        })}
      </div>

      <Reveal className="mt-10 text-center text-sm text-muted-foreground">
        {overseas ? (
          <p>
            Card payments go straight into your own Stripe account &mdash; Shopper takes no cut of your sales, only
            Stripe&apos;s standard card fees apply. Plans are paid month by month with no contract; if a plan ends, your
            store moves to Free and nothing is ever deleted. Selling from the UK, US or Canada?{" "}
            <Link href="/sell-online/uk" className="text-primary underline underline-offset-2">See how it works</Link>.
          </p>
        ) : (
          <p>
            Paid plans are bought 30 days at a time through Paystack — no automatic charges, cancel by
            simply not renewing. If a plan ends, your store moves to Free; nothing is ever deleted.
          </p>
        )}
      </Reveal>
    </div>
  );
}
