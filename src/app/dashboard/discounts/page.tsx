import React from "react";
import { getCurrentStore } from "@/lib/tenant";
import { listStoreDiscounts } from "@/modules/discounts/services/discount-service";
import { DiscountManager } from "@/components/dashboard/discounts/discount-manager";

export default async function DiscountsPage() {
  const { store } = await getCurrentStore();
  const discounts = await listStoreDiscounts(store.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Discounts & Coupons</h1>
        <p className="text-muted-foreground text-sm">
          Create and manage promotional discount codes for {store.name}.
        </p>
      </div>

      <DiscountManager
        initialDiscounts={discounts}
        currencySymbol={store.currencySymbol}
      />
    </div>
  );
}
