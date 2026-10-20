import type { IntlCurrency } from "@/modules/subscriptions/plans";

// Landing pages for sellers in the UK, US and Canada (/sell-online/[slug]).
// Written mainly for African diaspora businesses -- fashion, food, beauty --
// who sell to their community and beyond. Every claim here must be true of
// the product: card payments are the merchant's own Stripe account, tax is
// one rate set by the merchant, and the AI assistant isn't mentioned (not live).

export interface CountryPage {
  slug: string;
  /** Store country code (src/modules/regions/countries.ts). */
  code: "GB" | "US" | "CA";
  name: string;
  /** "in the UK" / "in the US" / "in Canada" */
  inName: string;
  currency: IntlCurrency;
  symbol: string;
  cities: string;
  tax: string;
  postcode: string;
  couriers: string;
  examplePrice: string;
}

export const COUNTRY_PAGES: CountryPage[] = [
  {
    slug: "uk",
    code: "GB",
    name: "United Kingdom",
    inName: "in the UK",
    currency: "GBP",
    symbol: "£",
    cities: "London, Manchester, Birmingham and beyond",
    tax: "VAT-registered? Set 20% VAT included in your prices and every order shows it. Not registered? Leave it off.",
    postcode: "UK addresses with county and postcode",
    couriers: "Royal Mail, Evri, DPD",
    examplePrice: "£45",
  },
  {
    slug: "us",
    code: "US",
    name: "United States",
    inName: "in the US",
    currency: "USD",
    symbol: "$",
    cities: "Houston, Atlanta, New York and beyond",
    tax: "Set your state's sales tax rate and it's added at checkout, on delivery too, and shown on every receipt.",
    postcode: "US addresses with state and ZIP code",
    couriers: "USPS, UPS",
    examplePrice: "$55",
  },
  {
    slug: "canada",
    code: "CA",
    name: "Canada",
    inName: "in Canada",
    currency: "CAD",
    symbol: "CA$",
    cities: "Toronto, Calgary, Ottawa and beyond",
    tax: "Set your GST/HST rate and it's added at checkout and shown on every receipt.",
    postcode: "Canadian addresses with province and postal code",
    couriers: "Canada Post, Purolator",
    examplePrice: "CA$70",
  },
];

export const getCountryPage = (slug: string) => COUNTRY_PAGES.find((c) => c.slug === slug);

/** Every country Shopper stores can be based in, for the countries page and homepage. */
export const MARKETS: {
  code: string;
  flag: string;
  name: string;
  currency: string;
  payments: string;
  href: string;
  /** Short line in the country's main business language. */
  blurb: string;
}[] = [
  { code: "NG", flag: "🇳🇬", name: "Nigeria", currency: "₦ Naira", payments: "Paystack, bank transfer, WhatsApp", href: "/guides/how-to-create-an-online-store-in-nigeria", blurb: "Where Shopper started, with dropshipping from Nigerian suppliers." },
  { code: "GH", flag: "🇬🇭", name: "Ghana", currency: "₵ Cedi", payments: "Paystack, mobile money, WhatsApp", href: "/signup", blurb: "Sell in cedis and take orders on WhatsApp." },
  { code: "KE", flag: "🇰🇪", name: "Kenya", currency: "KSh Shilling", payments: "Paystack, WhatsApp", href: "/signup", blurb: "Sell in shillings, storefront in English or Swahili." },
  { code: "BJ", flag: "🇧🇯", name: "Benin", currency: "CFA franc", payments: "PayDunya (mobile money & cards), WhatsApp", href: "/signup", blurb: "Votre boutique en ligne en français, paiement mobile money avec PayDunya. Dès 3 500 CFA par mois." },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom", currency: "£ Pound", payments: "Stripe cards, Apple Pay, Google Pay", href: "/sell-online/uk", blurb: "VAT, postcodes and card payments into your own Stripe." },
  { code: "US", flag: "🇺🇸", name: "United States", currency: "$ Dollar", payments: "Stripe cards, Apple Pay, Google Pay", href: "/sell-online/us", blurb: "Sales tax, ZIP codes and card payments into your own Stripe." },
  { code: "CA", flag: "🇨🇦", name: "Canada", currency: "CA$ Dollar", payments: "Stripe cards, Apple Pay, Google Pay", href: "/sell-online/canada", blurb: "GST/HST, postal codes and card payments into your own Stripe." },
];
