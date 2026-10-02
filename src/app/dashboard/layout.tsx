import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentStore, TenantError } from "@/lib/tenant";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { UserMenu } from "@/components/dashboard/user-menu";

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
  try {
    const { store } = await getCurrentStore();
    activeStoreName = store.name;
  } catch (error) {
    if (error instanceof TenantError) {
      redirect("/onboarding");
    }
    throw error;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
          <Image src="/logo-mark.png" alt="Shopper" width={24} height={24} className="size-6" priority />
          {activeStoreName}
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
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
        <main className="flex-1 p-4 pb-20 md:p-8 md:pb-8">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
