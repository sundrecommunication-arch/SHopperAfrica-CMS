"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";
import type { StoreRole } from "@/types/next-auth";

export function SidebarNav({ role }: { role: StoreRole }) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => !item.ownerOnly || role === "OWNER");

  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {visibleItems.map((item) => {
        const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
