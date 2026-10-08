"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function LogoutButton({ storeSlug }: { storeSlug: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const t = useT();

  async function handleLogout() {
    setIsLoading(true);
    try {
      await fetch("/api/storefront/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug }),
      });
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoading} className="gap-2">
      {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {t("account.logOut")}
    </Button>
  );
}
