import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  FolderTree,
  Users,
  Tag,
  CreditCard,
  Store,
  BarChart3,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown in the compact mobile bottom bar (docs section 42/83). */
  mobilePrimary?: boolean;
}

export const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, mobilePrimary: true },
  { label: "Orders", href: "/dashboard/orders", icon: ShoppingBag, mobilePrimary: true },
  { label: "Products", href: "/dashboard/products", icon: Package, mobilePrimary: true },
  { label: "Categories", href: "/dashboard/categories", icon: FolderTree },
  { label: "Customers", href: "/dashboard/customers", icon: Users },
  { label: "Discounts", href: "/dashboard/discounts", icon: Tag },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { label: "Store", href: "/dashboard/store", icon: Store, mobilePrimary: true },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];
