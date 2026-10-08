import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LANG_COOKIE, RTL_LOCALES, isLocale, matchAcceptLanguage, type Locale } from "./config";
import { MESSAGES } from "./messages";
import { createTranslator } from "./translate";

/**
 * Which language to show a storefront visitor, in priority order:
 *   1. what they picked in the language switcher (cookie)
 *   2. their device's language (Accept-Language), if we support it
 *   3. the store's default language (merchant setting)
 *   4. English
 * Location is deliberately not used -- a country says little about which of
 * its languages a person reads (see docs/marketing discussion).
 */
export const getStorefrontLocale = cache(async (storeDefault?: string | null): Promise<Locale> => {
  const [jar, h] = await Promise.all([cookies(), headers()]);
  const picked = jar.get(LANG_COOKIE)?.value;
  if (isLocale(picked)) return picked;
  const device = matchAcceptLanguage(h.get("accept-language"));
  if (device) return device;
  return isLocale(storeDefault) ? storeDefault : DEFAULT_LOCALE;
});

export async function getStorefrontI18n(storeDefault?: string | null) {
  const locale = await getStorefrontLocale(storeDefault);
  return {
    locale,
    dir: RTL_LOCALES.has(locale) ? ("rtl" as const) : ("ltr" as const),
    messages: MESSAGES[locale],
    t: createTranslator(locale, MESSAGES[locale]),
  };
}
