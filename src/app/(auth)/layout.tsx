import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm">
            S
          </span>
          Shopper
        </Link>
        <div className="rounded-xl border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
