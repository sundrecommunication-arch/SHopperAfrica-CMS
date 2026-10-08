"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, ShoppingBag, Search, MessageCircle, Menu, X, User } from "lucide-react";

import { useCart } from "./cart/cart-context";
import { formatWhatsAppPhone } from "@/modules/storefront/utils/whatsapp";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NavItemKind } from "@/modules/nav/validation/schemas";
import { useT } from "@/i18n/client";
import { navLabel } from "@/i18n/nav-label";
import { LanguageSwitcher } from "./language-switcher";

interface StorefrontHeaderProps {
  store: {
    name: string;
    slug: string;
    logoUrl?: string | null;
    whatsappNumber?: string | null;
    whatsappEnabled: boolean;
  };
  categories?: { id: string; name: string; slug: string }[];
  /**
   * The store's menu, in order, already filtered to visible items — see
   * getPublicNavItems in storefront-service.ts. PRODUCTS is special-cased
   * below (it renders the category dropdown instead of a plain link); every
   * other kind, including CUSTOM, renders as a link with a resolved href.
   * Merchants edit this list from Dashboard → Navigation
   * (src/app/dashboard/nav/page.tsx) — this component never hardcodes the
   * menu itself.
   */
  navItems: { kind: NavItemKind; label: string; url: string | null }[];
}

function resolveHref(
  item: { kind: NavItemKind; url: string | null },
  storeSlug: string
): string {
  switch (item.kind) {
    case "HOME":
      return `/store/${storeSlug}`;
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

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export function StorefrontHeader({ store, categories = [], navItems }: StorefrontHeaderProps) {
  const router = useRouter();
  const t = useT();
  const { openCart, itemCount } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileProductsOpen, setIsMobileProductsOpen] = useState(false);
  const [isProductsMenuOpen, setIsProductsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const whatsappPhone = store.whatsappNumber ? formatWhatsAppPhone(store.whatsappNumber) : null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/store/${store.slug}?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
    setIsMobileProductsOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile Menu Toggle & Store Logo/Name */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="md:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">{t("header.toggleMenu")}</span>
          </button>

          <Link href={`/store/${store.slug}`} className="flex items-center gap-3 group">
            {store.logoUrl ? (
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border bg-background">
                {/* object-contain (not cover) so non-square logos are never
                    cropped — they letterbox inside the square instead. The
                    dashboard recommends a square image for the best fit. */}
                <Image
                  src={store.logoUrl}
                  alt={store.name}
                  fill
                  className="object-contain p-0.5"
                  sizes="36px"
                />
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
                {store.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-lg font-bold tracking-tight group-hover:opacity-90 transition-opacity">
              {store.name}
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation — merchant-configured, in order */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) =>
            item.kind === "PRODUCTS" ? (
              <div
                key="products"
                className="relative"
                onMouseEnter={() => setIsProductsMenuOpen(true)}
                onMouseLeave={() => setIsProductsMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setIsProductsMenuOpen((v) => !v)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {navLabel(item, t)}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      isProductsMenuOpen && "rotate-180"
                    )}
                  />
                </button>

                {isProductsMenuOpen && (
                  <div className="absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-2">
                    <div className="max-h-96 overflow-y-auto rounded-lg border bg-popover p-2 shadow-lg">
                      <Link
                        href={`/store/${store.slug}`}
                        onClick={() => setIsProductsMenuOpen(false)}
                        className="block rounded-md px-3 py-2 text-sm font-semibold hover:bg-muted"
                      >
                        {t("common.allProducts")}
                      </Link>
                      {categories.length > 0 && <div className="my-1 border-t" />}
                      {categories.map((category) => (
                        <Link
                          key={category.id}
                          href={`/store/${store.slug}/categories/${category.slug}`}
                          onClick={() => setIsProductsMenuOpen(false)}
                          className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : item.kind === "CUSTOM" && item.url && isExternalUrl(item.url) ? (
              <a
                key={`${item.kind}-${item.label}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {navLabel(item, t)}
              </a>
            ) : (
              <Link
                key={`${item.kind}-${item.label}`}
                href={resolveHref(item, store.slug)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {navLabel(item, t)}
              </Link>
            )
          )}
        </nav>

        {/* Right: Search, WhatsApp & Cart */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">{t("common.search")}</span>
          </button>

          {/* WhatsApp Direct Chat */}
          {store.whatsappEnabled && whatsappPhone && (
            <a
              href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(t("header.whatsappGreeting", { store: store.name }))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[var(--store-primary)]/10 text-[var(--store-primary)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--store-primary)]/20 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp</span>
            </a>
          )}

          <LanguageSwitcher />

          {/* My Account */}
          <Link
            href={`/store/${store.slug}/account`}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={t("common.myAccount")}
          >
            <User className="h-5 w-5" />
          </Link>

          {/* Cart Icon with Live Counter */}
          <button
            type="button"
            onClick={openCart}
            className="relative rounded-full p-2 text-foreground hover:bg-muted transition-colors"
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground animate-in zoom-in">
                {itemCount}
              </span>
            )}
            <span className="sr-only">{t("header.openCart")}</span>
          </button>
        </div>
      </div>

      {/* Expandable Search Input */}
      {isSearchOpen && (
        <div className="border-t bg-muted/40 px-4 py-3 sm:px-6">
          <form
            onSubmit={handleSearchSubmit}
            className="container mx-auto flex max-w-2xl items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("header.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background h-10"
                autoFocus
              />
            </div>
            <Button type="submit" size="sm">
              {t("common.search")}
            </Button>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Mobile Drawer Menu — merchant-configured, in order */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background px-4 py-4 space-y-1">
          {navItems.map((item) =>
            item.kind === "PRODUCTS" ? (
              <div key="products-mobile">
                <button
                  type="button"
                  onClick={() => setIsMobileProductsOpen((v) => !v)}
                  className="flex w-full items-center justify-between text-sm font-medium hover:text-primary transition-colors py-2"
                >
                  {navLabel(item, t)}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isMobileProductsOpen && "rotate-180"
                    )}
                  />
                </button>
                {isMobileProductsOpen && (
                  <div className="ml-3 flex flex-col space-y-1 border-l pl-3 py-1">
                    <Link
                      href={`/store/${store.slug}`}
                      onClick={closeMobileMenu}
                      className="text-sm font-medium hover:text-primary transition-colors py-1"
                    >
                      {t("common.allProducts")}
                    </Link>
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/store/${store.slug}/categories/${category.slug}`}
                        onClick={closeMobileMenu}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors py-1"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : item.kind === "CUSTOM" && item.url && isExternalUrl(item.url) ? (
              <a
                key={`${item.kind}-${item.label}-mobile`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileMenu}
                className="block text-sm font-medium hover:text-primary transition-colors py-2"
              >
                {navLabel(item, t)}
              </a>
            ) : (
              <Link
                key={`${item.kind}-${item.label}-mobile`}
                href={resolveHref(item, store.slug)}
                onClick={closeMobileMenu}
                className="block text-sm font-medium hover:text-primary transition-colors py-2"
              >
                {navLabel(item, t)}
              </Link>
            )
          )}

          <Link
            href={`/store/${store.slug}/account`}
            onClick={closeMobileMenu}
            className="block text-sm font-medium hover:text-primary transition-colors py-2"
          >
            {t("common.myAccount")}
          </Link>

          {store.whatsappEnabled && whatsappPhone && (
            <div className="pt-3 border-t mt-2">
              <a
                href={`https://wa.me/${whatsappPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium text-[var(--store-primary)] py-1"
              >
                <MessageCircle className="h-4 w-4" />
                {t("header.chatOnWhatsapp")}
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
