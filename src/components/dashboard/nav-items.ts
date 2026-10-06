import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Package,
  FolderTree,
  Users,
  Tag,
  CreditCard,
  Store,
  BarChart3,
  Megaphone,
  Newspaper,
  FileText,
  ListOrdered,
  HelpCircle,
  Settings,
  UserPlus,
  Truck,
  Crown,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown in the compact mobile bottom bar (docs section 42/83). */
  mobilePrimary?: boolean;
  /** Hidden from MANAGER/STAFF — only the store owner sees this item. */
  ownerOnly?: boolean;
}

export const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, mobilePrimary: true },
  { label: "Orders", href: "/dashboard/orders", icon: ShoppingBag, mobilePrimary: true },
  { label: "Abandoned Carts", href: "/dashboard/abandoned-carts", icon: ShoppingCart },
  { label: "Products", href: "/dashboard/products", icon: Package, mobilePrimary: true },
  { label: "Categories", href: "/dashboard/categories", icon: FolderTree },
  { label: "Customers", href: "/dashboard/customers", icon: Users },
  { label: "Discounts", href: "/dashboard/discounts", icon: Tag },
  { label: "Delivery", href: "/dashboard/delivery", icon: Truck },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { label: "Store", href: "/dashboard/store", icon: Store, mobilePrimary: true },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Ad Performance", href: "/dashboard/ad-performance", icon: Megaphone },
  { label: "Blog", href: "/dashboard/blog", icon: Newspaper },
  { label: "Policies", href: "/dashboard/policies", icon: FileText },
  { label: "Navigation", href: "/dashboard/nav", icon: ListOrdered },
  { label: "FAQs", href: "/dashboard/faqs", icon: HelpCircle },
  { label: "Team", href: "/dashboard/team", icon: UserPlus, ownerOnly: true },
  { label: "Billing", href: "/dashboard/billing", icon: Crown, ownerOnly: true },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];
