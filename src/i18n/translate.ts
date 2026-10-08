import type { Messages } from "./messages/en";
import type { Locale } from "./config";

// Dot-path keys into the message tree, e.g. "checkout.placeOrder".
type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Paths<Messages>;
type PluralBase<K> = K extends `${infer B}_one` ? B : never;
export type PluralKey = PluralBase<MessageKey>;

export type Vars = Record<string, string | number>;

export interface Translator {
  (key: MessageKey, vars?: Vars): string;
  /** Picks key_one / key_other by count and fills {count}. */
  plural: (key: PluralKey, count: number, vars?: Vars) => string;
  /** Looks up a dynamic key (status codes, stored labels); falls back to `fallback`. */
  maybe: (key: string, fallback: string) => string;
  locale: Locale;
}

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in (node as object)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}

function fill(text: string, vars?: Vars) {
  return vars ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : text;
}

export function createTranslator(locale: Locale, messages: Messages): Translator {
  const t = ((key: MessageKey, vars?: Vars) => fill(lookup(messages, key) ?? key, vars)) as Translator;
  t.plural = (key, count, vars) => {
    // Intl picks the right category per language; we ship one/other forms.
    const category = new Intl.PluralRules(locale).select(count) === "one" ? "one" : "other";
    return t(`${key}_${category}` as MessageKey, { count, ...vars });
  };
  t.maybe = (key, fallback) => lookup(messages, key) ?? fallback;
  t.locale = locale;
  return t;
}
