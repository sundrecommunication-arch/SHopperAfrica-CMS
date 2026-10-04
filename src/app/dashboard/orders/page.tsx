import React from "react";
import Link from "next/link";
import { ShoppingBag, ChevronRight, MessageSquareQuote, Globe } from "lucide-react";

import { getCurrentStore } from "@/lib/tenant";
import { listStoreOrders } from "@/modules/orders/services/order-service";
import { resolveDateRange } from "@/lib/date-range";
import { DateRangeFilter } from "@/components/dashboard/filters/date-range-filter";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { store } = await getCurrentStore();
  const sp = await searchParams;
  const dateRange = resolveDateRange(sp);
  const orderList = await listStoreOrders(store.id, { from: dateRange.from, to: dateRange.to });

  if (orderList.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Orders</h1>
            <p className="text-muted-foreground text-sm">
              Track and manage your customer purchases.
            </p>
          </div>
          <DateRangeFilter />
        </div>
        <EmptyState
          icon={ShoppingBag}
          title={dateRange.key === "all" ? "No orders yet." : "No orders in this period."}
          description={
            dateRange.key === "all"
              ? "Your orders will appear here when customers purchase from your store."
              : "Try a wider date range, or switch back to All time."
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-muted-foreground text-sm">
            {orderList.length} {orderList.length === 1 ? "order" : "orders"} placed in {store.name}{" "}
            &mdash; {dateRange.label.toLowerCase()}
          </p>
        </div>
        <DateRangeFilter />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Fulfillment</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderList.map((order) => {
              const dateStr = new Date(order.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <TableRow key={order.id} className="hover:bg-muted/40">
                  <TableCell className="font-mono font-bold text-xs">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-primary hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {dateStr}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-medium text-foreground">
                      {order.customerName}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {order.customerPhone}
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.checkoutChannel === "WHATSAPP" ? (
                      <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground border-border">
                        <MessageSquareQuote className="h-3 w-3" />
                        WhatsApp
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        Website
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.fulfillmentStatus === "DELIVERED"
                          ? "default"
                          : order.fulfillmentStatus === "CANCELLED"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[11px] font-medium"
                    >
                      {order.fulfillmentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.paymentStatus === "PAID"
                          ? "default"
                          : order.paymentStatus === "FAILED"
                          ? "destructive"
                          : "outline"
                      }
                      className="text-[11px] font-medium"
                    >
                      {order.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-xs">
                    {store.currencySymbol}
                    {parseFloat(order.total).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/orders/${order.id}`}>
                      <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      <span className="sr-only">View order</span>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
