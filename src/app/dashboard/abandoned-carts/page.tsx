import React from "react";
import { ShoppingCart } from "lucide-react";

import { getCurrentStore } from "@/lib/tenant";
import { listAbandonedCheckouts } from "@/modules/orders/services/abandoned-cart-service";
import { AbandonedCartsList } from "@/components/dashboard/orders/abandoned-carts-list";
import { EmptyState } from "@/components/dashboard/empty-state";
import { resolveDateRange } from "@/lib/date-range";
import { DateRangeFilter } from "@/components/dashboard/filters/date-range-filter";

export default async function AbandonedCartsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { store } = await getCurrentStore();
  const sp = await searchParams;
  const dateRange = resolveDateRange(sp);
  const thresholdHours = store.abandonedCartThresholdHours ?? 2;
  const checkouts = await listAbandonedCheckouts(store.id, thresholdHours, dateRange);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Abandoned Carts</h1>
          <p className="text-muted-foreground text-sm">
            Website checkouts started more than {thresholdHours}{" "}
            {thresholdHours === 1 ? "hour" : "hours"} ago that still haven&apos;t been paid for
            ({dateRange.label.toLowerCase()}). Nudge the customer on WhatsApp to help them finish.
          </p>
        </div>
        <DateRangeFilter />
      </div>

      {checkouts.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No abandoned checkouts right now."
          description="When a customer starts checkout on your website (Paystack or bank transfer) and doesn't complete payment, they'll show up here so you can follow up personally."
        />
      ) : (
        <AbandonedCartsList
          checkouts={checkouts.map((c) => ({
            id: c.id,
            orderNumber: c.orderNumber,
            createdAt: c.createdAt.toISOString(),
            total: c.total,
            paymentMethod: c.paymentMethod,
            customerName: c.customerName,
            customerPhone: c.customerPhone,
            items: c.items,
            lastNudgeAt: c.lastNudgeAt ? c.lastNudgeAt.toISOString() : null,
            nudgeCount: c.nudgeCount,
          }))}
          storeName={store.name}
          currencySymbol={store.currencySymbol}
        />
      )}
    </div>
  );
}
