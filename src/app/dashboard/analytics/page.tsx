import React from "react";
import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  CreditCard,
  Package,
} from "lucide-react";

import { getCurrentStore } from "@/lib/tenant";
import { getStoreAnalytics } from "@/modules/analytics/services/analytics-service";
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

export default async function AnalyticsPage() {
  const { store } = await getCurrentStore();
  const analytics = await getStoreAnalytics(store.id);

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
      <div>
        <h1 className="text-2xl font-semibold">Analytics & Performance</h1>
        <p className="text-muted-foreground text-sm">
          Track revenue, customer volume, and best-selling items for {store.name}.
        </p>
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
