import type { NavItemKind } from "./validation/schemas";

// The four routes every storefront ships with, before a merchant customizes
// anything. Shared by the dashboard editor (src/modules/nav/services/nav-service.ts),
// the public storefront (src/modules/storefront/services/storefront-service.ts),
// and the dashboard's "Restore default menu" action — one source of truth so
// the three never drift apart.
export const BUILT_IN_NAV_KINDS = ["HOME", "PRODUCTS", "BLOG", "CONTACT"] as const;

export const DEFAULT_NAV_LABELS: Record<(typeof BUILT_IN_NAV_KINDS)[number], string> = {
  HOME: "Home",
  PRODUCTS: "Products",
  BLOG: "Blog",
  CONTACT: "Contact Us",
};

export interface DefaultNavItem {
  kind: NavItemKind;
  label: string;
  url: null;
  isVisible: true;
}

export const DEFAULT_NAV_ITEMS: DefaultNavItem[] = BUILT_IN_NAV_KINDS.map((kind) => ({
  kind,
  label: DEFAULT_NAV_LABELS[kind],
  url: null,
  isVisible: true,
}));
