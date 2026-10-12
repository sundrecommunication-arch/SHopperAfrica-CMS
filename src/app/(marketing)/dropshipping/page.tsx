import Link from "next/link";
import type { Metadata } from "next";
import { Banknote, MapPin, PackageCheck, ShieldCheck, Store, Truck, Wallet, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { JsonLd } from "@/components/seo/json-ld";

const TITLE = "Dropshipping in Nigeria — start selling online without buying stock";
const DESCRIPTION =
  "Add products from trusted Nigerian suppliers to your own Shopper store, set your price, and keep the profit. Suppliers deliver to your customers in days, and you're paid automatically. Free to start.";

export const metadata: Metadata = {
  title: "Dropshipping in Nigeria — no stock, no upfront cost",
  description: DESCRIPTION,
  alternates: { canonical: "/dropshipping" },
  openGraph: { title: TITLE, description: DESCRIPTION },
};

const STEPS = [
  { icon: Store, title: "Create your free store", body: "Sign up and name your store. It takes about 10 minutes — no developer, no monthly fee to start." },
  { icon: PackageCheck, title: "Pick products from suppliers", body: "Open Dropshipping in your dashboard, browse the catalog, and tap “Add to my store”. Photos and descriptions are copied for you." },
  { icon: Zap, title: "Set your price and share", body: "Choose your selling price — Shopper shows exactly what you'll earn on each sale. Then share your store link on WhatsApp, Instagram and TikTok." },
  { icon: Truck, title: "Supplier delivers, you get paid", body: "When a customer pays, the supplier ships to them directly and your profit lands in your bank account automatically." },
];

const WHY = [
  { icon: MapPin, title: "Local suppliers, fast delivery", body: "Products ship from within Nigeria in days — not 3–4 weeks from China, and no customs surprises for your customers." },
  { icon: Wallet, title: "No stock, no upfront cost", body: "You never buy inventory. You only pay the supplier's price after your customer has paid you." },
  { icon: Banknote, title: "Paid automatically", body: "Every payment is split instantly by Paystack: the supplier gets their price, you get your profit. No chasing anyone." },
  { icon: ShieldCheck, title: "Approved suppliers only", body: "Every supplier is reviewed by Shopper before their products appear in the catalog." },
];

const FAQS = [
  {
    q: "Can I start dropshipping in Nigeria without money?",
    a: "Yes. With Shopper you don't buy any stock upfront: you add suppliers' products to your free store, and the supplier is only paid their price after your customer has paid for the order. Your main cost is your time and any adverts you choose to run.",
  },
  {
    q: "How do I get paid as a dropshipper?",
    a: "Customers pay online by card, bank transfer or USSD through Paystack. The payment is split automatically: the supplier's price goes to the supplier and the rest goes to the bank account you add in your dashboard, usually the next working day. Paystack's fee (about 1.5% + ₦100) comes out of your share.",
  },
  {
    q: "Who delivers the products to my customers?",
    a: "The supplier does. Their price already includes delivery to your customer within the areas they serve, and they mark the order as shipped so your customer is emailed automatically.",
  },
  {
    q: "How much profit can I make dropshipping?",
    a: "You choose your selling price. For example, if a supplier's price is ₦12,000 and you sell for ₦18,000, you earn about ₦5,600 per sale after Paystack's fee. Shopper shows your exact profit before you add each product.",
  },
  {
    q: "Is dropshipping available on the free plan?",
    a: "Yes. Dropshipping works on every Shopper plan, including Free.",
  },
  {
    q: "I'm a wholesaler — can my products be dropshipped?",
    a: "Yes. Apply to become a Shopper supplier: list your products once, and stores across Nigeria can sell them. You deliver the orders and get paid automatically.",
  },
];

export default function DropshippingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />

      <Reveal className="mx-auto max-w-3xl text-center">
        <span className="text-sm font-semibold uppercase tracking-wide text-primary">Dropshipping</span>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl" style={{ fontFamily: "var(--font-marketing-display)" }}>
          Start selling online without buying stock.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Add products from trusted Nigerian suppliers to your own store, set your price and keep the profit. They deliver to
          your customers — you&apos;re paid automatically.
        </p>
        <div className="mx-auto mt-8 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="h-12 text-base sm:h-10">
            <Link href="/signup">Start dropshipping free</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 text-base sm:h-10">
            <Link href="/suppliers">I&apos;m a supplier</Link>
          </Button>
        </div>
      </Reveal>

      {/* Worked example */}
      <Reveal className="mx-auto mt-14 max-w-md rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold">Example: a leather tote bag</p>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><dt>Your customer pays</dt><dd>₦18,000</dd></div>
          <div className="flex justify-between text-muted-foreground"><dt>Supplier&apos;s price (incl. delivery)</dt><dd>−₦12,000</dd></div>
          <div className="flex justify-between text-muted-foreground"><dt>Paystack fee (approx.)</dt><dd>−₦370</dd></div>
          <div className="flex justify-between border-t pt-1.5 font-semibold text-primary"><dt>You earn</dt><dd>₦5,630</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">You never touched the bag. Shopper shows this for every product before you add it.</p>
      </Reveal>

      <section className="mt-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl" style={{ fontFamily: "var(--font-marketing-display)" }}>
          How it works
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
          Why dropship with Shopper
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {WHY.map((w) => (
            <div key={w.title} className="flex gap-4 rounded-2xl border p-6">
              <w.icon className="size-6 shrink-0 text-primary" />
              <div>
                <h3 className="font-semibold">{w.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{w.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ fontFamily: "var(--font-marketing-display)" }}>
          Dropshipping questions
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
          Your store could have products in it today.
        </h2>
        <p className="mt-3 text-muted-foreground">Free to start. No stock. No developer.</p>
        <Button asChild size="lg" className="mt-6 h-12 text-base sm:h-10">
          <Link href="/signup">Create your free store</Link>
        </Button>
      </Reveal>
    </div>
  );
}
