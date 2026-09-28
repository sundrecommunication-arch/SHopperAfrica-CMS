import Image from "next/image";
import Link from "next/link";

const PRODUCT_LINKS = [
  { href: "/welcome", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact us" },
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
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="flex flex-col gap-3 md:col-span-2">
            <Image src="/logo-full.png" alt="Shopper" width={120} height={32} className="h-7 w-auto" />
            <p className="max-w-sm text-sm text-muted-foreground">
              Shopper gives African business owners a real website, storefront, and checkout —
              free — so every ad, every search, and every WhatsApp chat leads somewhere real.
            </p>
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
