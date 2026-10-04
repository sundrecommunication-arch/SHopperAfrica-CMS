import React from "react";
import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  CreditCard,
  Package,
  BarChart3,
} from "lucide-react";

import { getCurrentStore } from "@/lib/tenant";
import {
  getStoreAnalytics,
  getStoreSalesTrend,
} from "@/modules/analytics/services/analytics-service";
import { resolveDateRange } from "@/lib/date-range";
import { DateRangeFilter } from "@/components/dashboard/filters/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { store } = await getCurrentStore();
  const sp = await searchParams;
  const dateRange = resolveDateRange(sp);

  // The chart itself is capped at 60 daily bars even for a wide custom
  // range -- the summary cards above still reflect the full selected range,
  // this just keeps the chart from turning into an unreadable wall of bars.
  const now = new Date();
  const trendTo = dateRange.to ?? now;
  let trendFrom = dateRange.from ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const MAX_TREND_DAYS = 60;
  const spanDays = Math.ceil((trendTo.getTime() - trendFrom.getTime()) / 86_400_000) + 1;
  if (spanDays > MAX_TREND_DAYS) {
    trendFrom = new Date(trendTo);
    trendFrom.setDate(trendFrom.getDate() - (MAX_TREND_DAYS - 1));
    trendFrom.setHours(0, 0, 0, 0);
  }

  const [analytics, salesTrend] = await Promise.all([
    getStoreAnalytics(store.id, dateRange),
    getStoreSalesTrend(store.id, { from: trendFrom, to: trendTo }),
  ]);
  const maxTrendRevenue = Math.max(...salesTrend.map((t) => t.revenue), 0);
  const hasTrendData = salesTrend.some((t) => t.revenue > 0);

  const metrics = [
    {
      title: "Total Paid Sales",
      value: `${store.currencySymbol}${analytics.totalRevenue.toLocaleString()}`,
      description: "Net revenue from paid orders",
      icon: DollarSign,
    },
    {
      title: "Total Orders",
      value: analytics.totalOrders,
      description: `${analytics.paidOrders} paid orders`,
      icon: ShoppingBag,
    },
    {
      title: "Average Order Value",
      value: `${store.currencySymbol}${analytics.avgOrderValue.toLocaleString()}`,
      description: "Average revenue per paid order",
      icon: TrendingUp,
    },
    {
      title: "Customers",
      value: analytics.totalCustomers,
      description: "Unique buyers recorded",
      icon: Users,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Analytics & Performance</h1>
          <p className="text-muted-foreground text-sm">
            Track revenue, customer volume, and best-selling items for {store.name} &mdash;{" "}
            {dateRange.label.toLowerCase()}.
          </p>
        </div>
        <DateRangeFilter />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sales Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Sales Trend
          </CardTitle>
          <CardDescription>
            Paid revenue by day, {dateRange.label.toLowerCase()} ({salesTrend.length}{" "}
            {salesTrend.length === 1 ? "day" : "days"} shown).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasTrendData ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No paid orders in this period yet. Daily revenue will chart here once orders come in.
            </p>
          ) : (
            <div>
              <div className="flex items-end gap-[2px] h-40">
                {salesTrend.map((t) => {
                  const heightPct =
                    maxTrendRevenue > 0 ? (t.revenue / maxTrendRevenue) * 100 : 0;
                  const label = new Date(`${t.date}T00:00:00`).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <div key={t.date} className="group relative flex-1 h-full flex items-end">
                      <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 hidden -translate-x-1/2 flex-col items-center whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-[10px] shadow-sm group-hover:flex z-10">
                        <span className="font-semibold text-foreground">
                          {store.currencySymbol}
                          {t.revenue.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          {label} &middot; {t.orderCount} order{t.orderCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div
                        className={`w-full rounded-t transition-colors ${
                          t.revenue > 0 ? "bg-primary/80 group-hover:bg-primary" : "bg-border"
                        }`}
                        style={{ height: t.revenue > 0 ? `${Math.max(heightPct, 3)}%` : "2px" }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-[2px] mt-1.5">
                {salesTrend.map((t) => (
                  <span
                    key={t.date}
                    className="flex-1 text-center text-[9px] text-muted-foreground tabular-nums"
                  >
                    {new Date(`${t.date}T00:00:00`).getDate()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Top Products (7 Cols) */}
        <div className="space-y-6 lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Top Selling Products
              </CardTitle>
              <CardDescription>Highest volume items by total units sold.</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.topProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No sales data yet. Once customers order, your top products will appear here.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Units Sold</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.topProducts.map((p, idx) => (
                      <TableRow key={p.productName}>
                        <TableCell className="text-xs font-medium">
                          <span className="text-muted-foreground mr-2 font-mono text-[10px]">
                            #{idx + 1}
                          </span>
                          {p.productName}
                        </TableCell>
                        <TableCell className="text-center text-xs font-bold">
                          {p.quantity}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          {store.currencySymbol}
                          {p.revenue.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment & Fulfillment Breakdowns (5 Cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Payment Methods Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Sales by Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {analytics.paymentMethodBreakdown.length === 0 ? (
                <p className="text-muted-foreground">No payments recorded.</p>
              ) : (
                analytics.paymentMethodBreakdown.map((pm) => (
                  <div
                    key={pm.method}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{pm.method}</span>
                      <p className="text-[11px] text-muted-foreground">{pm.count} orders</p>
                    </div>
                    <span className="font-bold">
                      {store.currencySymbol}
                      {pm.total.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Fulfillment Status Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Order Fulfillment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {analytics.statusBreakdown.length === 0 ? (
                <p className="text-muted-foreground">No orders recorded.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {analytics.statusBreakdown.map((st) => (
                    <div
                      key={st.status}
                      className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5"
                    >
                      <span className="font-medium text-foreground">{st.status}</span>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold">
                        {st.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
