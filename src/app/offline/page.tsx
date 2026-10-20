import type { Metadata } from "next";

export const metadata: Metadata = { title: "You're offline | Shopper", robots: { index: false } };

// Shown by the service worker (public/sw.js) when a page can't load because
// there's no connection. Static, so it can be cached ahead of time.
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      {/* Plain <img>: this page shows with no connection, so it can't go through the image optimizer; the service worker caches this file. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="Shopper" width={56} height={56} className="rounded-xl" />
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Check your internet connection. Your store is still online for your customers. This page will work again as
        soon as you&apos;re connected.
      </p>
      {/* A plain link (no JavaScript needed): reloads the page that couldn't load. */}
      <a
        href=""
        className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </a>
    </div>
  );
}
