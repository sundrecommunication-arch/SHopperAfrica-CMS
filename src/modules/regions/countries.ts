// Countries Shopper stores can be based in, and what changes with them:
// address wording, how card payments are taken, and the usual sales tax.
// No "server-only": the dashboard and storefront checkout use this too.

export type CardProvider = "PAYSTACK" | "PAYDUNYA" | "STRIPE";

export interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  dialCode: string;
  /** "State" / "County" / "Province" -- the address field after the city. */
  regionLabel: string;
  /** "ZIP code" / "Postcode" / "Postal code"; null where addresses don't use one. */
  postcodeLabel: string | null;
  /** Card payments at checkout: Paystack (Nigeria, Ghana, Kenya), PayDunya
   *  (francophone West Africa), Stripe (UK/US/Canada). */
  cardProvider: CardProvider;
  /** Storefront language new stores start with (default English). */
  locale?: "fr";
  /** Suggested tax setup when a merchant picks this country (they can change it). */
  tax: { label: string; rate: number; inclusive: boolean };
}

export const COUNTRIES: CountryInfo[] = [
  { code: "NG", name: "Nigeria", currency: "NGN", dialCode: "+234", regionLabel: "State", postcodeLabel: null, cardProvider: "PAYSTACK", tax: { label: "VAT", rate: 0, inclusive: true } },
  { code: "GH", name: "Ghana", currency: "GHS", dialCode: "+233", regionLabel: "Region", postcodeLabel: null, cardProvider: "PAYSTACK", tax: { label: "VAT", rate: 0, inclusive: true } },
  { code: "KE", name: "Kenya", currency: "KES", dialCode: "+254", regionLabel: "County", postcodeLabel: null, cardProvider: "PAYSTACK", tax: { label: "VAT", rate: 0, inclusive: true } },
  { code: "BJ", name: "Benin", currency: "XOF", dialCode: "+229", regionLabel: "Department", postcodeLabel: null, cardProvider: "PAYDUNYA", locale: "fr", tax: { label: "TVA", rate: 0, inclusive: true } },
  { code: "GB", name: "United Kingdom", currency: "GBP", dialCode: "+44", regionLabel: "County", postcodeLabel: "Postcode", cardProvider: "STRIPE", tax: { label: "VAT", rate: 20, inclusive: true } },
  { code: "US", name: "United States", currency: "USD", dialCode: "+1", regionLabel: "State", postcodeLabel: "ZIP code", cardProvider: "STRIPE", tax: { label: "Sales tax", rate: 0, inclusive: false } },
  { code: "CA", name: "Canada", currency: "CAD", dialCode: "+1", regionLabel: "Province", postcodeLabel: "Postal code", cardProvider: "STRIPE", tax: { label: "GST/HST", rate: 0, inclusive: false } },
];

export function getCountry(code: string | null | undefined): CountryInfo {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}

export const CURRENCIES = [
  { code: "NGN", symbol: "₦", label: "Nigerian Naira (₦)" },
  { code: "GHS", symbol: "₵", label: "Ghanaian Cedi (₵)" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling (KSh)" },
  { code: "XOF", symbol: "CFA ", label: "West African CFA franc (CFA)" },
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
  { code: "GBP", symbol: "£", label: "British Pound (£)" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar (CA$)" },
  { code: "EUR", symbol: "€", label: "Euro (€)" },
] as const;

/** Currencies Stripe card checkout is offered in (all two-decimal currencies). */
export const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [string, ...string[]];

/** The currency symbol to store alongside a currency code. */
export function currencySymbol(code: string) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export const STRIPE_CURRENCIES = new Set(["USD", "GBP", "CAD", "EUR"]);
