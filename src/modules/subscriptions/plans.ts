// Plan definitions (docs sections 33/34). The single source of truth for
// what each plan costs and unlocks -- used by enforcement, the billing page,
// the admin panel and the public pricing page. No "server-only": the client
// renders these too.

export type PlanKey = "FREE" | "STARTER" | "BUSINESS";

/** Currencies plans are priced in besides naira (paid via our team for now). */
export type IntlCurrency = "GBP" | "USD" | "CAD" | "XOF";
export const INTL_CURRENCIES: { code: IntlCurrency; symbol: string; country: string }[] = [
  { code: "GBP", symbol: "£", country: "UK" },
  { code: "USD", symbol: "$", country: "US" },
  { code: "CAD", symbol: "CA$", country: "Canada" },
  { code: "XOF", symbol: "CFA", country: "Benin" },
];

export interface PlanLimits {
  /** null = unlimited */
  maxProducts: number | null;
  /** Paystack / PayDunya card payments at checkout */
  onlinePayments: boolean;
  customDomain: boolean;
  /** Hide "Powered by Shopper" in the storefront footer */
  hideBranding: boolean;
  /** Invite managers/staff */
  team: boolean;
  /** Google / Meta / TikTok ad performance dashboard */
  ads: boolean;
}

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  /** Monthly price in NGN */
  priceMonthly: number;
  /** Monthly price for stores in the UK, US and Canada. */
  intlPrices: Record<IntlCurrency, number>;
  tagline: string;
  limits: PlanLimits;
  /** Human-readable feature list for pricing/billing cards */
  features: string[];
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  FREE: {
    key: "FREE",
    name: "Free",
    priceMonthly: 0,
    intlPrices: { GBP: 0, USD: 0, CAD: 0, XOF: 0 },
    tagline: "Start selling today",
    limits: {
      maxProducts: 25,
      onlinePayments: false,
      customDomain: false,
      hideBranding: false,
      team: false,
      ads: false,
    },
    features: [
      "Up to 25 products",
      "Your own storefront link",
      "WhatsApp ordering",
      "Bank transfer & cash on delivery",
      "Discounts, delivery fees & order emails",
      "Blog & automatic SEO",
      "Dropshipping from Shopper suppliers (Nigeria)",
    ],
  },
  STARTER: {
    key: "STARTER",
    name: "Starter",
    priceMonthly: 10_000,
    intlPrices: { GBP: 5, USD: 6, CAD: 8, XOF: 3_500 },
    tagline: "Look professional, get paid online",
    limits: {
      maxProducts: 200,
      onlinePayments: true,
      customDomain: true,
      hideBranding: true,
      team: false,
      ads: false,
    },
    features: [
      "Everything in Free",
      "Up to 200 products",
      "Card payments (Paystack, PayDunya or Stripe)",
      "Your own domain (e.g. www.yourstore.com)",
      "Remove \"Powered by Shopper\"",
    ],
  },
  BUSINESS: {
    key: "BUSINESS",
    name: "Business",
    priceMonthly: 25_000,
    intlPrices: { GBP: 12, USD: 15, CAD: 20, XOF: 8_500 },
    tagline: "For growing teams",
    limits: {
      maxProducts: null,
      onlinePayments: true,
      customDomain: true,
      hideBranding: true,
      team: true,
      ads: true,
    },
    features: [
      "Everything in Starter",
      "Unlimited products",
      "Team members (managers & staff)",
      "Ad performance dashboard (Google, Meta, TikTok)",
    ],
  },
};

export const PLAN_ORDER: PlanKey[] = ["FREE", "STARTER", "BUSINESS"];

/** Length of one paid period / the existing-store trial. */
export const PERIOD_DAYS = 30;

export function formatNaira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

/** A plan's monthly price in naira or one of the overseas currencies. */
export function formatPlanPrice(plan: PlanDefinition, currency: "NGN" | IntlCurrency) {
  if (currency === "NGN") return formatNaira(plan.priceMonthly);
  // CFA francs are written after the amount: "3,500 CFA".
  if (currency === "XOF") return `${plan.intlPrices.XOF.toLocaleString("en-US")} CFA`;
  const symbol = INTL_CURRENCIES.find((c) => c.code === currency)!.symbol;
  return `${symbol}${plan.intlPrices[currency].toLocaleString()}`;
}

/** The overseas pricing currency for a store's currency, if it has one. */
export function intlCurrencyFor(storeCurrency: string): IntlCurrency | null {
  return INTL_CURRENCIES.some((c) => c.code === storeCurrency) ? (storeCurrency as IntlCurrency) : null;
}
