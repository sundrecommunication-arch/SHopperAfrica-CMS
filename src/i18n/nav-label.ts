import { DEFAULT_NAV_LABELS, BUILT_IN_NAV_KINDS } from "@/modules/nav/constants";
import type { NavItemKind } from "@/modules/nav/validation/schemas";
import type { MessageKey, Translator } from "./translate";

/**
 * Menu labels are merchant-editable. Translate the built-in ones only while
 * they still read exactly like the English default ("Home", "Products"...);
 * anything the merchant renamed is shown exactly as they wrote it.
 */
export function navLabel(item: { kind: NavItemKind; label: string }, t: Translator): string {
  const kind = item.kind as (typeof BUILT_IN_NAV_KINDS)[number];
  if ((BUILT_IN_NAV_KINDS as readonly string[]).includes(kind) && item.label === DEFAULT_NAV_LABELS[kind]) {
    return t(`nav.${kind}` as MessageKey);
  }
  return item.label;
}
