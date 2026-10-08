// Languages the storefront + checkout can be shown in (docs section 51).
// No "server-only": the language switcher imports this too.

export const LOCALES = ["en", "fr", "pt", "sw", "ha", "yo", "ig", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Each language's name in that language -- what the switcher shows. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  pt: "Português",
  sw: "Kiswahili",
  ha: "Hausa",
  yo: "Yorùbá",
  ig: "Igbo",
  ar: "العربية",
};

/** English names, for the merchant's settings dropdown. */
export const LOCALE_ENGLISH_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "French",
  pt: "Portuguese",
  sw: "Swahili",
  ha: "Hausa",
  yo: "Yoruba",
  ig: "Igbo",
  ar: "Arabic",
};

export const RTL_LOCALES: ReadonlySet<Locale> = new Set(["ar"]);

/** The shopper's own pick from the language switcher (all stores). */
export const LANG_COOKIE = "shopper_lang";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Best supported language from an Accept-Language header (the device's
 * language settings), honouring q-weights; null if none are supported.
 * e.g. "yo-NG,yo;q=0.9,en-US;q=0.8" -> "yo".
 */
export function matchAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { base: tag.trim().toLowerCase().split("-")[0], q: q ? parseFloat(q.split("=")[1]) || 0 : 1 };
    })
    .filter((x) => x.base && x.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { base } of ranked) {
    if (isLocale(base)) return base;
  }
  return null;
}
