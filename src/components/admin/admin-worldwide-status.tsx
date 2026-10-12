"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Status {
  configured: boolean;
  connected?: boolean;
  error?: string;
  sample?: { total: number; names: string[] };
  fx?: { rate: number; source: string; buffered: number };
  fxError?: string;
}

export function AdminWorldwideStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    const res = await fetch("/api/admin/worldwide");
    setStatus(await res.json().catch(() => null));
    setBusy(false);
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Worldwide (CJ Dropshipping)</CardTitle>
          <CardDescription>
            Orders are placed and paid from Shopper&apos;s CJ wallet — keep it topped up. Failures appear below as
            &quot;needs attention&quot;.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={check} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Check connection"}
        </Button>
      </CardHeader>
      {status && (
        <CardContent className="space-y-1 text-sm">
          {!status.configured ? (
            <p className="text-destructive">Not set up: add CJ_API_KEY on Railway.</p>
          ) : status.connected ? (
            <p className="text-green-700">
              Connected ✓ — {status.sample?.total.toLocaleString()} products found for “bag”
              {status.sample?.names.length ? ` (e.g. ${status.sample.names[0]})` : ""}.
            </p>
          ) : (
            <p className="text-destructive">Can&apos;t connect to CJ: {status.error}</p>
          )}
          {status.fx ? (
            <p className="text-muted-foreground">
              Dollar rate: ₦{status.fx.rate.toLocaleString()} ({status.fx.source === "fixed" ? "fixed by USD_NGN_RATE" : "live market"}),
              priced at ₦{Math.round(status.fx.buffered).toLocaleString()} with the buffer.
            </p>
          ) : (
            <p className="text-destructive">{status.fxError}</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
