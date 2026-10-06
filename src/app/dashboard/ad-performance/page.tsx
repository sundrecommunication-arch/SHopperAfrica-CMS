import React from "react";
import { getCurrentStore } from "@/lib/tenant";
import { getMetricsForStore, listConnections } from "@/modules/ads/services/ad-connections-service";
import { AdPerformanceDashboard, type PlatformPanelData } from "@/components/dashboard/ads/ad-performance-dashboard";
import type { AdPlatform } from "@/lib/ad-platforms";
import { getStorePlan } from "@/modules/subscriptions/services/subscription-service";
import { UpgradeNotice } from "@/components/dashboard/billing/upgrade-notice";

const PLATFORMS: AdPlatform[] = ["GOOGLE_ADS", "META", "TIKTOK"];

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function AdPerformancePage() {
  const { store } = await getCurrentStore();
  if (!(await getStorePlan(store.id)).limits.ads) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Ad Performance</h1>
        <UpgradeNotice feature="The ad performance dashboard" planName="Business" />
      </div>
    );
  }
  const connections = await listConnections(store.id);

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  const metricsByConnection = await getMetricsForStore(store.id, {
    from: toDateStr(from),
    to: toDateStr(to),
  });

  const platforms: PlatformPanelData[] = PLATFORMS.map((platform) => {
    const connection = connections.find((c) => c.platform === platform && c.status !== "DISCONNECTED");
    const entry = metricsByConnection.find((m) => m.connection.platform === platform);
    const dailyMetrics =
      entry?.metrics.map((row) => ({
        date: row.date,
        impressions: row.impressions,
        clicks: row.clicks,
        spend: Number(row.spend),
        conversions: row.conversions,
      })) ?? [];

    const summary = dailyMetrics.reduce(
      (acc, row) => ({
        impressions: acc.impressions + row.impressions,
        clicks: acc.clicks + row.clicks,
        spend: acc.spend + row.spend,
        conversions: acc.conversions + row.conversions,
      }),
      { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
    );

    return {
      platform,
      // Client-safe subset only — never pass the encrypted token columns to
      // a client component.
      connection: connection
        ? {
            id: connection.id,
            accountName: connection.accountName,
            externalAccountId: connection.externalAccountId,
            currency: connection.currency,
            status: connection.status,
            lastError: connection.lastError,
            lastSyncedAt: connection.lastSyncedAt ? connection.lastSyncedAt.toISOString() : null,
          }
        : null,
      summary,
      dailyMetrics,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Ad Performance</h1>
        <p className="text-muted-foreground text-sm">
          Connect your Google Ads, Meta (Facebook &amp; Instagram), and TikTok Ads accounts to see
          spend and results for {store.name} alongside your Shopper sales — last 30 days.
        </p>
      </div>

      <AdPerformanceDashboard storeCurrencySymbol={store.currencySymbol} platforms={platforms} />
    </div>
  );
}
