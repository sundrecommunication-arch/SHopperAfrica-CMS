import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CreditCard, Languages, Percent, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { MARKETS } from "@/modules/marketing/international";

const DESCRIPTION =
  "Shopper works in Nigeria, Ghana, Kenya, Benin, the UK, the US and Canada: your local currency, local card and mobile-money payments, tax and addresses.";

export const metadata: Metadata = {
  title: "Countries: sell online from Africa to the UK, US and Canada",
  description: DESCRIPTION,
  alternates: { canonical: "/sell-online" },
  openGraph: { title: "Shopper works where you sell", description: DESCRIPTION },
};

const POINTS = [
  { icon: Wallet, title: "Your currency", body: "Prices in naira, cedis, shillings, CFA francs, pounds or dollars, set when you create your store." },
  { icon: CreditCard, title: "Local payments", body: "Paystack in Nigeria, Ghana and Kenya, PayDunya mobile money in Benin, and Stripe in the UK, US and Canada. Bank transfer and WhatsApp orders everywhere." },
  { icon: Percent, title: "Tax and addresses", body: "VAT, TVA, sales tax or GST/HST on every order, and the right address fields at checkout: state, county, province, postcode or ZIP." },
  { icon: Languages, title: "Your customers' language", body: "Storefronts in English, French, Portuguese, Swahili, Hausa, Yoruba, Igbo and Arabic." },
];

export default function CountriesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <Reveal className="mx-auto max-w-3xl text-center">
        <span className="text-sm font-semibold uppercase tracking-wide text-primary">Countries</span>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl" style={{ fontFamily: "var(--font-marketing-display)" }}>
          Shopper works where you sell.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          From Lagos to Cotonou to London. Pick your country when you create your store and Shopper sets up your
          currency, payments, tax and address format for you.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MARKETS.map((m) => (
          <Link
            key={m.code}
            href={m.href}
            className="group flex flex-col rounded-2xl border p-6 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl leading-none" aria-hidden>{m.flag}</span>
              <div>
                <h2 className="font-semibold">{m.name}</h2>
                <p className="text-xs text-muted-foreground">{m.currency}</p>
              </div>
            </div>
            <p className="mt-4 flex-1 text-sm text-muted-foreground">{m.blurb}</p>
            <p className="mt-3 text-xs font-medium">{m.payments}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              {m.href.startsWith("/sell-online") ? "See how it works" : m.href === "/signup" ? "Start free" : "Read the guide"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <section className="mt-20 grid gap-5 sm:grid-cols-2">
        {POINTS.map((p) => (
          <div key={p.title} className="flex gap-4 rounded-2xl border p-6">
            <p.icon className="size-6 shrink-0 text-primary" />
            <div>
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
            </div>
          </div>
        ))}
      </section>

      <Reveal className="mt-20 rounded-2xl bg-primary/5 p-8 text-center sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ fontFamily: "var(--font-marketing-display)" }}>
          Open your store in your country today.
        </h2>
        <p className="mt-3 text-muted-foreground">Free to start. Upgrade when you&apos;re ready for card payments and your own domain.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 text-base sm:h-10">
            <Link href="/signup">Create your free store</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 text-base sm:h-10">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </Reveal>
    </div>
  );
}
