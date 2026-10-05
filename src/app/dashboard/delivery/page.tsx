import React from "react";
import { getCurrentStore } from "@/lib/tenant";
import { listDeliveryOptions } from "@/modules/shipping/services/shipping-service";
import { DeliveryOptionsManager } from "@/components/dashboard/delivery/delivery-options-manager";

export default async function DeliveryPage() {
  const { store, role } = await getCurrentStore();
  const options = await listDeliveryOptions(store.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Delivery</h1>
        <p className="text-muted-foreground text-sm">
          Set where you deliver and how much it costs. Customers choose one at checkout.
        </p>
      </div>

      <DeliveryOptionsManager
        initialOptions={options}
        currencySymbol={store.currencySymbol}
        canEdit={role === "OWNER" || role === "MANAGER"}
      />
    </div>
  );
}
