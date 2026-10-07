// Content for the /compare/[slug] SEO pages ("Bumpa alternative",
// "Shopify alternative Nigeria", ...). Claims about other products are kept
// deliberately general and dated -- re-check them whenever this file is
// edited, and bump REVIEWED_ON.

export const REVIEWED_ON = "October 2026";

export interface ComparisonRow {
  label: string;
  shopper: string;
  other: string;
}

export interface Comparison {
  slug: string;
  competitor: string;
  /** <title> and H1 */
  title: string;
  metaDescription: string;
  intro: string;
  rows: ComparisonRow[];
  chooseShopper: string[];
  chooseOther: string[];
  faqs: { q: string; a: string }[];
}

const SHOPPER_BASE = {
  freePlan: "Yes — free forever, up to 25 products",
  currency: "Naira (₦10,000 / ₦25,000 per month for paid plans)",
  whatsapp: "Built in — orders arrive on your WhatsApp fully written out",
  payments: "Bank transfer, cash on delivery, WhatsApp, and Paystack / PayDunya cards (Starter+)",
  setup: "About 10 minutes from your phone, no developer or plugins",
  delivery: "Built in — set delivery zones, fees and free-delivery thresholds",
};

export const COMPARISONS: Comparison[] = [
  {
    slug: "shopper-vs-bumpa",
    competitor: "Bumpa",
    title: "Shopper vs Bumpa: which online store is right for your business?",
    metaDescription:
      "Comparing Shopper and Bumpa for Nigerian sellers: free plan, WhatsApp ordering, card payments, delivery fees and pricing in naira.",
    intro:
      "Bumpa and Shopper are both built for African businesses that sell on social media. Bumpa is a popular business-management app; Shopper is focused on giving you a fast, professional online store that sends orders straight to your WhatsApp — free to start.",
    rows: [
      { label: "Free plan", shopper: SHOPPER_BASE.freePlan, other: "Check bumpa.shop for current plans and trials" },
      { label: "Priced in", shopper: SHOPPER_BASE.currency, other: "Naira" },
      { label: "WhatsApp ordering", shopper: SHOPPER_BASE.whatsapp, other: "Social-selling tools — check their current features" },
      { label: "Delivery fees at checkout", shopper: SHOPPER_BASE.delivery, other: "Check their current features" },
      { label: "Card payments", shopper: SHOPPER_BASE.payments, other: "Supported on paid plans" },
      { label: "Main focus", shopper: "A professional online store + checkout", other: "Business management app (sales, inventory, bookkeeping)" },
    ],
    chooseShopper: [
      "You mainly want a beautiful store link customers can order from by themselves",
      "You want orders delivered to WhatsApp already written out",
      "You want to start free and only pay when you need card payments or your own domain",
    ],
    chooseOther: [
      "You want an all-in-one app for bookkeeping, in-person sales and inventory",
      "You already run your business on Bumpa and are happy with it",
    ],
    faqs: [
      {
        q: "Is Shopper a good Bumpa alternative?",
        a: "If your priority is an online store that takes orders and payments for you — with WhatsApp ordering and delivery fees built in — yes. You can start on the Free plan and compare side by side before moving.",
      },
      {
        q: "Can I move my products from Bumpa to Shopper?",
        a: "Yes. Add your products to Shopper (photos, prices, sizes and colours) and share your new store link. It takes most sellers less than an hour for a typical catalogue.",
      },
      {
        q: "Does Shopper work for sellers outside Lagos?",
        a: "Yes. Shopper works anywhere in Nigeria — set a delivery fee for each area you deliver to, or offer pickup.",
      },
    ],
  },
  {
    slug: "shopper-vs-shopify",
    competitor: "Shopify",
    title: "Shopper vs Shopify: a Shopify alternative for Nigerian sellers",
    metaDescription:
      "Looking for a Shopify alternative in Nigeria? Compare Shopper and Shopify on pricing in naira, WhatsApp orders, Paystack payments and setup time.",
    intro:
      "Shopify is one of the world's biggest e-commerce platforms. It's powerful — but it's built for a global market, priced in US dollars, and many features need paid apps. Shopper is built for how Nigerians actually sell: WhatsApp-first, naira pricing, and ready in minutes.",
    rows: [
      { label: "Free plan", shopper: SHOPPER_BASE.freePlan, other: "Free trial, then a paid monthly plan" },
      { label: "Priced in", shopper: SHOPPER_BASE.currency, other: "US dollars" },
      { label: "WhatsApp ordering", shopper: SHOPPER_BASE.whatsapp, other: "Needs a third-party app" },
      { label: "Card payments in Nigeria", shopper: SHOPPER_BASE.payments, other: "Through third-party payment providers" },
      { label: "Delivery fees", shopper: SHOPPER_BASE.delivery, other: "Built in, with more complex setup" },
      { label: "Setup", shopper: SHOPPER_BASE.setup, other: "Flexible, but often needs themes, apps or a developer" },
    ],
    chooseShopper: [
      "You sell mostly to customers in Nigeria through Instagram and WhatsApp",
      "You don't want to pay in dollars or juggle apps and plugins",
      "You want to be live today, from your phone",
    ],
    chooseOther: [
      "You sell internationally at large scale and need Shopify's huge app ecosystem",
      "You have a developer or agency to customise and maintain your store",
    ],
    faqs: [
      {
        q: "Is Shopper cheaper than Shopify?",
        a: "Shopper has a free-forever plan, and paid plans are priced in naira — ₦10,000 or ₦25,000 per month — with no app or plugin costs on top.",
      },
      {
        q: "Can I use Paystack with Shopper?",
        a: "Yes. On the Starter and Business plans you connect your own Paystack (or PayDunya) account and customers pay by card at checkout. The money goes straight to your account.",
      },
      {
        q: "Can I use my own domain like Shopify?",
        a: "Yes — custom domains are included on the Starter and Business plans.",
      },
    ],
  },
  {
    slug: "shopper-vs-wix",
    competitor: "Wix",
    title: "Shopper vs Wix: which is better for selling online in Nigeria?",
    metaDescription:
      "Shopper vs Wix for Nigerian businesses: compare free plans, selling and payments, WhatsApp orders and how fast you can start taking orders.",
    intro:
      "Wix is a general website builder — great for portfolios and information sites, with e-commerce on its higher plans. Shopper is built only for selling: every store comes with a product catalogue, checkout, delivery fees and WhatsApp ordering from day one.",
    rows: [
      { label: "Free plan", shopper: SHOPPER_BASE.freePlan + ", and you can sell on it", other: "Free website plan, but selling online needs a paid plan" },
      { label: "Priced in", shopper: SHOPPER_BASE.currency, other: "Set for a global market" },
      { label: "WhatsApp ordering", shopper: SHOPPER_BASE.whatsapp, other: "Not built in" },
      { label: "Built for", shopper: "Selling products online", other: "All kinds of websites" },
      { label: "Delivery fees", shopper: SHOPPER_BASE.delivery, other: "Available on e-commerce plans" },
      { label: "Setup", shopper: SHOPPER_BASE.setup, other: "Drag-and-drop design — more freedom, more time" },
    ],
    chooseShopper: [
      "Your main goal is to sell products and take orders",
      "You want to sell on a free plan while you grow",
      "You want orders on WhatsApp and payments handled for you",
    ],
    chooseOther: [
      "You need a highly custom-designed website with lots of non-shop pages",
      "Selling products is a small part of what your website does",
    ],
    faqs: [
      {
        q: "Can I sell on Shopper's free plan?",
        a: "Yes. The Free plan lets you list up to 25 products and take orders by WhatsApp, bank transfer and cash on delivery.",
      },
      {
        q: "Do I need design skills to use Shopper?",
        a: "No. Add your logo, colours and banner images, and your store is designed for you — it looks good on phones out of the box.",
      },
    ],
  },
  {
    slug: "shopper-vs-selling-on-whatsapp",
    competitor: "selling only on WhatsApp & Instagram",
    title: "Online store vs selling only in WhatsApp and Instagram DMs",
    metaDescription:
      "Still selling only through WhatsApp and Instagram DMs? See how an online store saves time, prevents lost orders and builds trust — and why you don't have to give up WhatsApp.",
    intro:
      "WhatsApp and Instagram are where your customers are — and you should keep selling there. But running your whole business inside chats means retyping prices, calculating delivery and losing orders in long threads. A Shopper store gives every chat a link to order from, and sends the order back to your WhatsApp.",
    rows: [
      { label: "Prices & options", shopper: "One link with every product, price, size and colour", other: "Sent one by one, over and over" },
      { label: "Delivery fees", shopper: "Calculated automatically at checkout", other: "Worked out in each chat" },
      { label: "Orders", shopper: "Arrive on WhatsApp fully written out, and tracked in your dashboard", other: "Scattered across chats and screenshots" },
      { label: "Payments", shopper: "Bank transfer details, cash on delivery or card — recorded on each order", other: "\"I've paid\" screenshots to match up by hand" },
      { label: "Trust", shopper: "A real store with receipts and order emails", other: "\"Is this page legit?\"" },
      { label: "Cost", shopper: "Free to start", other: "Free — but costs you hours every day" },
    ],
    chooseShopper: [
      "You're answering the same price questions all day",
      "You've lost orders because a chat got buried",
      "You want customers to trust you enough to pay before delivery",
    ],
    chooseOther: [
      "You only sell a handful of items to people you know personally",
    ],
    faqs: [
      {
        q: "Do I have to stop selling on WhatsApp?",
        a: "No — Shopper is built around WhatsApp. Share your store link in chats, status and your bio; orders come back to your WhatsApp ready to confirm.",
      },
      {
        q: "How long does it take to set up?",
        a: "Most sellers create their store and add their first products in about 10 minutes, from their phone.",
      },
      {
        q: "What does it cost?",
        a: "The Free plan is free forever for up to 25 products. Paid plans start at ₦10,000 per month when you want card payments, your own domain and more products.",
      },
    ],
  },
];

export function getComparison(slug: string) {
  return COMPARISONS.find((c) => c.slug === slug) ?? null;
}
