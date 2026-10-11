"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSafeCallbackPath } from "@/lib/safe-callback";

/** Login <-> signup link that keeps the ?callbackUrl= (read after mount; the pages are static). */
export function AuthSwitchLink({ href, children }: { href: "/login" | "/signup"; children: React.ReactNode }) {
  const [target, setTarget] = useState<string>(href);
  useEffect(() => {
    const callback = getSafeCallbackPath();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL once after hydration
    if (callback) setTarget(`${href}?callbackUrl=${encodeURIComponent(callback)}`);
  }, [href]);
  return (
    <Link href={target} className="text-primary underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
