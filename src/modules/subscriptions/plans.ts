// Plan definitions (docs sections 33/34). The single source of truth for
// what each plan costs and unlocks -- used by enforcement, the billing page,
// the admin panel and the public pricing page. No "server-only": the client
// renders these too.

export type PlanKey = "FREE" | "STARTER" | "BUSINESS";

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
    ],
  },
  STARTER: {
    key: "STARTER",
    name: "Starter",
    priceMonthly: 10_000,
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
      "Card & online payments (Paystack, PayDunya)",
      "Your own domain (e.g. www.yourstore.com)",
      "Remove \"Powered by Shopper\"",
    ],
  },
  BUSINESS: {
    key: "BUSINESS",
    name: "Business",
    priceMonthly: 25_000,
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
