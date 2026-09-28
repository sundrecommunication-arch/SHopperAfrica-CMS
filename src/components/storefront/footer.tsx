import React from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

import { formatWhatsAppPhone } from "@/modules/storefront/utils/whatsapp";
import { POLICY_TYPE_TO_SLUG } from "@/modules/storefront/utils/policy-slugs";
import type { PolicyType } from "@/modules/policies/validation/schemas";
import type { NavItemKind } from "@/modules/nav/validation/schemas";

interface StorefrontFooterProps {
  store: {
    name: string;
    slug: string;
    description?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    addressText?: string | null;
    whatsappNumber?: string | null;
    whatsappEnabled: boolean;
    poweredByHidden?: boolean;
  };
  policies?: { type: PolicyType; title: string }[];
  /** Same merchant-configured, already-visible-filtered menu as the header. */
  navItems?: { kind: NavItemKind; label: string; url: string | null }[];
}

function footerHref(item: { kind: NavItemKind; url: string | null }, storeSlug: string): string {
  switch (item.kind) {
    case "HOME":
    case "PRODUCTS":
      return `/store/${storeSlug}`;
    case "BLOG":
      return `/store/${storeSlug}/blog`;
    case "CONTACT":
      return `/store/${storeSlug}/contact`;
    case "CUSTOM":
      return item.url ?? "#";
  }
}

// Category links used to live in this footer too (sliced to 5, since an
// unbounded list would blow out the layout for stores with many
// categories). They now live entirely under the header's "Products" menu,
// which nests every category with no slicing needed — so this footer no
// longer takes a `categories` prop at all.
export function StorefrontFooter({ store, policies = [], navItems = [] }: StorefrontFooterProps) {
  const currentYear = new Date().getFullYear();
  const whatsappPhone = store.whatsappNumber ? formatWhatsAppPhone(store.whatsappNumber) : null;

  return (
    <footer className="border-t bg-muted/20 mt-16">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-5">
          {/* Col 1: Store Bio */}
          <div className="space-y-3 sm:col-span-2">
            <h3 className="text-lg font-bold tracking-tight">{store.name}</h3>
            {store.description && (
              <p className="text-sm text-muted-foreground max-w-md line-clamp-3">
                {store.description}
              </p>
            )}
            {store.whatsappEnabled && whatsappPhone && (
              <div className="pt-2">
                <a
                  href={`https://wa.me/${whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--store-primary)] text-white px-4 py-2 text-xs font-semibold hover:brightness-90 transition-all shadow-xs"
                >
                  <MessageCircle className="h-4 w-4" />
                  Order / Chat on WhatsApp
                </a>
              </div>
            )}
          </div>

          {/* Col 2: Company — mirrors the merchant's configured menu (Dashboard → Navigation) */}
          {navItems.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Company
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {navItems.map((item) => (
                  <li key={`${item.kind}-${item.label}`}>
                    {item.kind === "CUSTOM" && item.url && /^https?:\/\//i.test(item.url) ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={footerHref(item, store.slug)}
                        className="hover:text-foreground transition-colors"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Col 3: Legal — only policies the merchant has published */}
          {policies.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Legal
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {policies.map((policy) => (
                  <li key={policy.type}>
                    <Link
                      href={`/store/${store.slug}/policies/${POLICY_TYPE_TO_SLUG[policy.type]}`}
                      className="hover:text-foreground transition-colors"
                    >
                      {policy.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Col 4: Contact & Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Contact
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {store.contactEmail && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a href={`mailto:${store.contactEmail}`} className="hover:text-foreground">
                    {store.contactEmail}
                  </a>
                </li>
              )}
              {store.contactPhone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a href={`tel:${store.contactPhone}`} className="hover:text-foreground">
                    {store.contactPhone}
                  </a>
                </li>
              )}
              {store.addressText && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <span>{store.addressText}</span>
                </li>
              )}
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {currentYear} {store.name}. All rights reserved.</p>
          {!store.poweredByHidden && (
            <p className="flex items-center gap-1">
              <span>Powered by</span>
              <span className="font-semibold text-foreground">Shopper</span>
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
