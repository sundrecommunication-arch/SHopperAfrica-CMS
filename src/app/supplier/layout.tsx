import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { getSupplierForUser } from "@/modules/dropship/services/supplier-service";

export const metadata: Metadata = { title: "Shopper Suppliers", robots: { index: false, follow: false } };

const NAV = [
  { href: "/supplier", label: "Overview" },
  { href: "/supplier/orders", label: "Orders" },
  { href: "/supplier/products", label: "Products" },
  { href: "/supplier/payouts", label: "Payouts" },
];

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const supplier = session?.user?.id ? await getSupplierForUser(session.user.id) : null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
          <Link href="/supplier" className="flex shrink-0 items-center gap-2 font-semibold">
            <Image src="/logo-mark.png" alt="" width={24} height={24} className="size-6" />
            <span>
              Shopper <span className="font-normal text-muted-foreground">Suppliers</span>
            </span>
          </Link>
          {supplier?.status === "APPROVED" && (
            // Own row on phones so all four links fit; inline from sm: up.
            <nav className="order-last flex w-full gap-5 overflow-x-auto text-sm sm:order-none sm:w-auto sm:gap-4">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="whitespace-nowrap text-muted-foreground hover:text-foreground">
                  {n.label}
                </Link>
              ))}
            </nav>
          )}
          <span className="ml-auto hidden truncate text-xs text-muted-foreground sm:block">{supplier?.businessName ?? session?.user?.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
