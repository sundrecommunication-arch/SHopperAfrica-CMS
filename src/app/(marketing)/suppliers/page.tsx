import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Banknote, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Become a supplier — sell wholesale through hundreds of online stores",
  description:
    "List your products once on Shopper. Online stores across Nigeria sell them, you deliver to their customers, and you're paid automatically for every order.",
};

const STEPS = [
  { icon: BadgeCheck, title: "Apply in 3 minutes", body: "Tell us what you sell and where you ship from. We approve suppliers within 1-2 working days." },
  { icon: Store, title: "List your products once", body: "Add photos, your price to stores (including delivery) and your stock. Stores add your products with one tap." },
  { icon: Truck, title: "Deliver the orders", body: "When a store sells your product, you get an email with the customer's address. Deliver it and tap “Shipped”." },
  { icon: Banknote, title: "Get paid automatically", body: "Customers pay online. Your price goes straight to your bank account — no chasing stores for money." },
];

export default function SuppliersPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold uppercase tracking-wide text-primary">For wholesalers & manufacturers</span>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl" style={{ fontFamily: "var(--font-marketing-display)" }}>
          Let hundreds of online stores sell your products.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Shopper stores can add your products to their shop with one tap. They do the marketing — you deliver, and get paid
          for every order, automatically.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 text-base sm:h-10">
            <Link href="/signup?callbackUrl=/supplier/apply">Become a supplier</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 text-base sm:h-10">
            <Link href="/login?callbackUrl=/supplier">Supplier sign in</Link>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Free to join. No monthly fees.</p>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-2xl border p-6">
            <s.icon className="size-6 text-primary" />
            <h2 className="mt-3 font-semibold">
              {i + 1}. {s.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
