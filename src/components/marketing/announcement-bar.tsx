import Link from "next/link";

/** Thin bar above the marketing nav for the latest big news. */
export function AnnouncementBar() {
  return (
    <div className="bg-primary px-4 py-2 text-center text-xs text-primary-foreground sm:text-sm">
      <span className="font-semibold">New:</span> Shopper now works in the UK, US, Canada and Benin.{" "}
      <Link href="/sell-online" className="font-semibold underline underline-offset-2">
        See all countries →
      </Link>
    </div>
  );
}
