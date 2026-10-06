import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentStore, TenantError } from "@/lib/tenant";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { UserMenu } from "@/components/dashboard/user-menu";
import type { StoreRole } from "@/types/next-auth";
import Link from "next/link";
import { getStorePlan, getPlanBanner } from "@/modules/subscriptions/services/subscription-service";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Don't gate on session.stores directly — it's read from the JWT, which
  // only refreshes on an explicit client update() and can still be empty for
  // one request right after onboarding creates a brand-new store (the
  // session cookie hasn't caught up yet). getCurrentStore() has the same
  // problem with session.activeStoreId, which is why it already falls back
  // to a direct DB lookup of the user's own membership (see src/lib/tenant.ts)
  // — reuse that here instead of duplicating the stale check.
  let activeStoreName: string;
  let role: StoreRole;
  let storeId: string;
  let suspended: boolean;
  try {
    const result = await getCurrentStore();
    activeStoreName = result.store.name;
    role = result.role;
    storeId = result.store.id;
    suspended = Boolean(result.store.suspendedAt);
  } catch (error) {
    if (error instanceof TenantError) {
      redirect("/onboarding");
    }
    throw error;
  }

  // One plan banner for the whole dashboard: suspended, lapsed, or about to end.
  const banner = getPlanBanner(await getStorePlan(storeId), suspended);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
          <Image src="/logo-mark.png" alt="Shopper" width={24} height={24} className="size-6" priority />
          {activeStoreName}
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav role={role} />
        </div>
        <div className="border-t p-2">
          <UserMenu name={session.user.name} email={session.user.email} />
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
          <span className="font-semibold">{activeStoreName}</span>
          <UserMenu name={session.user.name} email={session.user.email} />
        </header>
        {banner && (
          <div className="flex flex-wrap items-center justify-center gap-x-2 border-b bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <span>{banner}</span>
            {!suspended && role === "OWNER" && (
              <Link href="/dashboard/billing" className="underline underline-offset-2">
                See plans
              </Link>
            )}
          </div>
        )}
        <main className="flex-1 p-4 pb-20 md:p-8 md:pb-8">{children}</main>
        <MobileNav role={role} />
      </div>
    </div>
  );
}
