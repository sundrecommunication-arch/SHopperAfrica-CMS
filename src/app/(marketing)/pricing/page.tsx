import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = { title: "Pricing" };

const INCLUDED = [
  "Your own online storefront",
  "WhatsApp ordering",
  "Online payments (card & bank transfer)",
  "Discounts & promo codes",
  "Abandoned cart recovery",
  "Built-in blog & automatic SEO",
  "Customer notes & order management",
  "Ad performance dashboard (Google, Meta, TikTok)",
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          No card required
        </span>
        <h1
          className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl"
          style={{ fontFamily: "var(--font-marketing-display)" }}
        >
          Free — for real.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Every African business owner gets the full Shopper storefront at no cost. No trial
          countdown, no feature paywall to get started.
        </p>
      </Reveal>

      <Reveal className="mt-12 rounded-3xl border border-border p-8 sm:p-10">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-primary">Free plan</span>
          <span className="text-5xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-marketing-display)" }}>
            ₦0
          </span>
          <span className="text-sm text-muted-foreground">forever, for your first store</span>
        </div>

        <ul className="mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
          {INCLUDED.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" className="text-base">
            <Link href="/signup">Create your free store</Link>
          </Button>
        </div>
      </Reveal>

      <Reveal className="mt-10 text-center text-sm text-muted-foreground">
        <p>
          Growing businesses that need more — additional staff seats, more stores, deeper
          analytics — will have Starter and Business plans to grow into. For now, everything
          above is free while Shopper is in its early access period.
        </p>
      </Reveal>
    </div>
  );
}
