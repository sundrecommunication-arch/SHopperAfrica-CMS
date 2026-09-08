"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

// Compact bottom navigation for phones (docs section 42/83) — the merchant
// manages orders and products from their phone as often as from a desktop.
export function MobileNav() {
  const pathname = usePathname();
  const items = navItems.filter((item) => item.mobilePrimary);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background md:hidden">
      {items.map((item) => {
        const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
