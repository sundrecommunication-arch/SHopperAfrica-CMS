import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { UserMenu } from "@/components/dashboard/user-menu";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.stores.length === 0) {
    redirect("/onboarding");
  }

  const activeStore = session.stores.find((s) => s.storeId === session.activeStoreId) ?? session.stores[0];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
          <Image src="/logo-mark.png" alt="Shopper" width={24} height={24} className="size-6" priority />
          {activeStore.storeName}
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
          <span className="font-semibold">{activeStore.storeName}</span>
          <UserMenu name={session.user.name} email={session.user.email} />
        </header>
        <main className="flex-1 p-4 pb-20 md:p-8 md:pb-8">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
