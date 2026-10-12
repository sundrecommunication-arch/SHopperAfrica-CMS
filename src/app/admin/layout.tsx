import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { requirePlatformAdminPage } from "@/lib/platform-admin";
import { findMissingSchema } from "@/modules/admin/services/schema-check";

export const metadata: Metadata = { title: "Shopper Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requirePlatformAdminPage();
  const missingSchema = await findMissingSchema();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <Image src="/logo-mark.png" alt="" width={24} height={24} className="size-6" />
            Shopper Admin
          </Link>
          <nav className="flex min-w-0 gap-4 overflow-x-auto whitespace-nowrap text-sm">
            <Link href="/admin" className="text-muted-foreground hover:text-foreground">Overview</Link>
            <Link href="/admin/stores" className="text-muted-foreground hover:text-foreground">Stores</Link>
            <Link href="/admin/users" className="text-muted-foreground hover:text-foreground">No store</Link>
            <Link href="/admin/suppliers" className="text-muted-foreground hover:text-foreground">Suppliers</Link>
            <Link href="/admin/dropship" className="text-muted-foreground hover:text-foreground">Dropship</Link>
            <Link href="/admin/ai" className="text-muted-foreground hover:text-foreground">AI usage</Link>
          </nav>
          <span className="ml-auto hidden text-xs text-muted-foreground sm:block">{email}</span>
        </div>
      </header>
      {missingSchema.length > 0 && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <div className="mx-auto max-w-6xl">
            <p className="font-semibold">The live database is missing recent updates, so some pages will fail.</p>
            <p className="mt-1">
              Run <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">npm run db:push</code> against the live database. If it asks about
              truncating a table, choose <strong>No, add the constraint without truncating the table</strong> (press Enter).
            </p>
            <p className="mt-1 text-xs opacity-80">
              Missing: {missingSchema.slice(0, 12).join(", ")}
              {missingSchema.length > 12 && ` and ${missingSchema.length - 12} more`}
            </p>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
