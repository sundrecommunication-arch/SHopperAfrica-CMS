import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { requirePlatformAdminPage } from "@/lib/platform-admin";

export const metadata: Metadata = { title: "Shopper Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requirePlatformAdminPage();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <Image src="/logo-mark.png" alt="" width={24} height={24} className="size-6" />
            Shopper Admin
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="text-muted-foreground hover:text-foreground">Overview</Link>
            <Link href="/admin/stores" className="text-muted-foreground hover:text-foreground">Stores</Link>
          </nav>
          <span className="ml-auto hidden text-xs text-muted-foreground sm:block">{email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
