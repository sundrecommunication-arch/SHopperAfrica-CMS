import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { PLANS, PLAN_ORDER, formatNaira } from "@/modules/subscriptions/plans";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
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

      <div className="mt-12 grid gap-6 md:grid-cols-3">
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
                  {formatNaira(plan.priceMonthly)}
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
        <p>
          Paid plans are bought 30 days at a time through Paystack — no automatic charges, cancel by
          simply not renewing. If a plan ends, your store moves to Free; nothing is ever deleted.
        </p>
      </Reveal>
    </div>
  );
}
