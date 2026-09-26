"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plug, RefreshCw, Unplug } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdPlatform } from "@/lib/ad-platforms";

export interface PlatformPanelData {
  platform: AdPlatform;
  connection: {
    id: string;
    accountName: string | null;
    externalAccountId: string;
    currency: string | null;
    status: "CONNECTED" | "NEEDS_REAUTH" | "ERROR" | "DISCONNECTED";
    lastError: string | null;
    lastSyncedAt: string | null;
  } | null;
  summary: { impressions: number; clicks: number; spend: number; conversions: number };
  dailyMetrics: { date: string; impressions: number; clicks: number; spend: number; conversions: number }[];
}

const PLATFORM_LABELS: Record<AdPlatform, string> = {
  GOOGLE_ADS: "Google Ads",
  META: "Meta (Facebook & Instagram)",
  TIKTOK: "TikTok Ads",
};

const PLATFORM_SLUGS: Record<AdPlatform, string> = {
  GOOGLE_ADS: "google-ads",
  META: "meta",
  TIKTOK: "tiktok",
};

const statusVariant = {
  CONNECTED: "success",
  NEEDS_REAUTH: "warning",
  ERROR: "destructive",
  DISCONNECTED: "secondary",
} as const;

export function AdPerformanceDashboard({
  storeCurrencySymbol,
  platforms,
}: {
  storeCurrencySymbol: string;
  platforms: PlatformPanelData[];
}) {
  const router = useRouter();

  useEffect(() => {
    // Read the connect/callback redirect's query params directly rather than
    // via useSearchParams(), which would force this whole tree into a
    // Suspense boundary just to show a one-time toast.
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) {
      toast.success(`${PLATFORM_LABELS[slugToPlatform(connected)]} connected.`);
    } else if (error) {
      toast.error(describeConnectError(error));
    }
    if (connected || error) {
      router.replace("/dashboard/ad-performance");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {platforms.map((panel) => (
        <PlatformCard key={panel.platform} panel={panel} currencySymbol={storeCurrencySymbol} />
      ))}
    </div>
  );
}

function PlatformCard({
  panel,
  currencySymbol,
}: {
  panel: PlatformPanelData;
  currencySymbol: string;
}) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const slug = PLATFORM_SLUGS[panel.platform];
  const connection = panel.connection;
  const isConnected = connection && connection.status !== "DISCONNECTED";

  async function refresh() {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/integrations/${slug}/sync`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not refresh — try again shortly.");
        return;
      }
      toast.success(`${PLATFORM_LABELS[panel.platform]} refreshed.`);
      router.refresh();
    } finally {
      setIsSyncing(false);
    }
  }

  async function disconnect() {
    if (!window.confirm(`Disconnect ${PLATFORM_LABELS[panel.platform]}? You can reconnect any time.`)) {
      return;
    }
    setIsDisconnecting(true);
    try {
      const res = await fetch(`/api/integrations/${slug}/disconnect`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not disconnect");
        return;
      }
      toast.success(`${PLATFORM_LABELS[panel.platform]} disconnected.`);
      router.refresh();
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{PLATFORM_LABELS[panel.platform]}</CardTitle>
          {connection && <Badge variant={statusVariant[connection.status]}>{connection.status.replace("_", " ")}</Badge>}
        </div>
        <CardDescription>
          {isConnected
            ? connection?.accountName ?? connection?.externalAccountId
            : "Not connected yet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {isConnected ? (
          <>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Metric label="Spend" value={`${currencySymbol}${panel.summary.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
              <Metric label="Impressions" value={panel.summary.impressions.toLocaleString()} />
              <Metric label="Clicks" value={panel.summary.clicks.toLocaleString()} />
              <Metric label="Conversions" value={panel.summary.conversions.toLocaleString()} />
            </div>

            {connection?.status === "NEEDS_REAUTH" && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                This connection needs to be re-authorized — click Connect again below.
              </p>
            )}
            {connection?.status === "ERROR" && connection.lastError && (
              <p className="text-xs text-destructive line-clamp-2" title={connection.lastError}>
                Last sync error: {connection.lastError}
              </p>
            )}
            {connection?.lastSyncedAt && (
              <p className="text-muted-foreground text-[11px]">
                Last synced {new Date(connection.lastSyncedAt).toLocaleString()}
              </p>
            )}

            {panel.dailyMetrics.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Date</TableHead>
                      <TableHead className="text-right text-[10px]">Spend</TableHead>
                      <TableHead className="text-right text-[10px]">Clicks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...panel.dailyMetrics]
                      .slice(-10)
                      .reverse()
                      .map((row) => (
                        <TableRow key={row.date}>
                          <TableCell className="text-[11px]">{row.date}</TableCell>
                          <TableCell className="text-right text-[11px]">
                            {currencySymbol}
                            {row.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-[11px]">{row.clicks}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              {connection?.status === "NEEDS_REAUTH" ? (
                <Button asChild size="sm" className="gap-1.5">
                  <a href={`/api/integrations/${slug}/connect`}>
                    <Plug className="size-3.5" />
                    Reconnect
                  </a>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={refresh} disabled={isSyncing}>
                  {isSyncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                  Refresh
                </Button>
              )}
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={disconnect} disabled={isDisconnecting}>
                {isDisconnecting ? <Loader2 className="size-3.5 animate-spin" /> : <Unplug className="size-3.5" />}
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-auto">
            <Button asChild className="w-full gap-1.5">
              <a href={`/api/integrations/${slug}/connect`}>
                <Plug className="size-3.5" />
                Connect {PLATFORM_LABELS[panel.platform]}
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="text-muted-foreground text-[10px]">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

function slugToPlatform(slug: string): AdPlatform {
  if (slug === "google-ads") return "GOOGLE_ADS";
  if (slug === "meta") return "META";
  return "TIKTOK";
}

function describeConnectError(code: string): string {
  if (code.endsWith("_not_configured")) {
    return "This platform isn't set up yet on Shopper's side — check back soon.";
  }
  if (code.endsWith("_denied")) {
    return "Connection cancelled.";
  }
  if (code === "invalid_state" || code === "not_authorized") {
    return "That connection link expired or wasn't valid — please try connecting again.";
  }
  return "Couldn't complete the connection. Please try again.";
}
