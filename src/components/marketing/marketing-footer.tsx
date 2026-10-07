import Image from "next/image";
import Link from "next/link";
import { CookieSettingsLink } from "./cookie-consent";

const PRODUCT_LINKS = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact us" },
];

const RESOURCE_LINKS = [
  { href: "/guides/how-to-create-an-online-store-in-nigeria", label: "Create an online store in Nigeria" },
  { href: "/compare/shopper-vs-bumpa", label: "Shopper vs Bumpa" },
  { href: "/compare/shopper-vs-shopify", label: "Shopper vs Shopify" },
  { href: "/compare/shopper-vs-wix", label: "Shopper vs Wix" },
  { href: "/compare/shopper-vs-selling-on-whatsapp", label: "Store vs selling in DMs" },
];

const ACCOUNT_LINKS = [
  { href: "/signup", label: "Create your store" },
  { href: "/login", label: "Sign in" },
];

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/70 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-5">
          <div className="flex flex-col gap-3 md:col-span-2">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Image src="/logo-mark.png" alt="" width={28} height={28} className="size-7" />
              Shopper
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Shopper is an e-commerce website you can start for free — a real alternative to every
              other online store builder in Africa — so every ad, every search, and every WhatsApp chat leads to a sale.
            </p>
            <a
              href="https://www.instagram.com/shopperafricacms/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-sm text-foreground/80 hover:text-foreground"
            >
              {/* lucide-react dropped brand/logo icons, so this is a small inline glyph instead of a package icon. */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              @shopperafricacms
            </a>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Product
            </span>
            {PRODUCT_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-foreground/80 hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Resources
            </span>
            {RESOURCE_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-foreground/80 hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Account
            </span>
            {ACCOUNT_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-foreground/80 hover:text-foreground">
                {link.label}
              </Link>
            ))}
            <a
              href="mailto:sundrecommunication@gmail.com"
              className="text-sm text-foreground/80 hover:text-foreground"
            >
              sundrecommunication@gmail.com
            </a>
            <CookieSettingsLink className="w-fit text-left text-sm text-foreground/80 hover:text-foreground" />
          </div>
        </div>

        <div className="mt-10 border-t border-border/70 pt-6 text-xs leading-relaxed text-muted-foreground">
          <p>
            © {year} Sundre Communications. All rights reserved. Shopper is a product built and
            licensed by Sundre Communications — unauthorized copying, reproduction, or
            redistribution of this platform or its source code is prohibited.
          </p>
        </div>
      </div>
    </footer>
  );
}
