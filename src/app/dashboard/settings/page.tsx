import React from "react";
import { getCurrentStore } from "@/lib/tenant";
import { StoreSettingsForm } from "@/components/dashboard/settings/store-settings-form";
import { OrderAlertsCard } from "@/components/pwa/order-alerts-card";

export default async function SettingsPage() {
  const { store } = await getCurrentStore();

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Store Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage visibility, regional currency, branding colors, and address for {store.name}.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Order alerts on this device</h2>
        <OrderAlertsCard variant="settings" />
      </div>

      <StoreSettingsForm store={store} />
    </div>
  );
}
