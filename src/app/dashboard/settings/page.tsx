import React from "react";
import { getCurrentStore } from "@/lib/tenant";
import { StoreSettingsForm } from "@/components/dashboard/settings/store-settings-form";

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

      <StoreSettingsForm store={store} />
    </div>
  );
}
