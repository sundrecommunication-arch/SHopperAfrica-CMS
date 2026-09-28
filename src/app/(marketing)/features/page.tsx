import Link from "next/link";
import type { Metadata } from "next";
import {
  ShoppingBag,
  MessageCircle,
  CreditCard,
  Tag,
  Clock,
  BarChart3,
  Search,
  ShieldCheck,
  Globe2,
  Users,
  FileText,
  Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = { title: "Features" };

const GROUPS = [
  {
    title: "Sell anywhere your customers already are",
    items: [
      { icon: ShoppingBag, title: "A real online storefront", body: "Products, categories, and a checkout, live at your own store address in minutes." },
      { icon: MessageCircle, title: "WhatsApp ordering", body: "Let customers order straight into WhatsApp, exactly how they already like to buy." },
      { icon: CreditCard, title: "Online payments", body: "Accept card and bank transfer payments directly on your store, no WhatsApp back-and-forth required." },
      { icon: Tag, title: "Discounts & promo codes", body: "Launch a sale or a coupon code whenever you want — no developer, no waiting." },
    ],
  },
  {
    title: "Get found, without paying for every click",
    items: [
      { icon: Search, title: "Automatic SEO", body: "Every store ships with a sitemap and structured data out of the box, so Google can actually index it." },
      { icon: Globe2, title: "Custom domain", body: "Connect yourname.com to your Shopper store whenever you're ready to make it official." },
      { icon: FileText, title: "Built-in blog", body: "Publish posts that bring in search traffic for the questions your customers are already asking." },
    ],
  },
  {
    title: "Run the business, not just the storefront",
    items: [
      { icon: Clock, title: "Abandoned cart recovery", body: "See exactly which online checkouts were left unpaid, and follow up on WhatsApp before you lose the sale." },
      { icon: Users, title: "Customer notes", body: "Keep a running note on every customer — preferences, history, anything worth remembering." },
      { icon: Layers, title: "Order & inventory management", body: "Track every order status and manage your product catalog from one dashboard." },
    ],
  },
  {
    title: "Grow with confidence",
    items: [
      { icon: BarChart3, title: "One dashboard for all your ads", body: "Connect Google Ads, Meta Ads, and TikTok Ads and see how each is actually performing — side by side." },
      { icon: ShieldCheck, title: "Secure, multi-tenant hosting", body: "Your store's data is isolated and protected — built the way real e-commerce platforms are built, not a template." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h1
          className="text-4xl font-semibold tracking-tight sm:text-5xl"
          style={{ fontFamily: "var(--font-marketing-display)" }}
        >
          Everything your business needs online.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Shopper isn&apos;t just a storefront — it&apos;s the website, the checkout, and the
          visibility a growing business needs, in one free platform.
        </p>
      </Reveal>

      <div className="mt-16 flex flex-col gap-16">
        {GROUPS.map((group, gi) => (
          <Reveal key={group.title} delay={gi * 60}>
            <h2 className="text-xl font-semibold tracking-tight">{group.title}</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {group.items.map((item) => (
                <div key={item.title} className="rounded-2xl border border-border p-6">
                  <item.icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-3 font-semibold">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-20 rounded-3xl border border-border bg-muted/30 px-6 py-14 text-center sm:px-12">
        <h2
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ fontFamily: "var(--font-marketing-display)" }}
        >
          All of this, for free.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          See exactly what&apos;s included on the free plan.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">Create your free store</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">View pricing</Link>
          </Button>
        </div>
      </Reveal>
    </div>
  );
}
