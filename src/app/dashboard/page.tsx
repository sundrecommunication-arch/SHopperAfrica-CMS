import { eq, and, count, sum, gte, lte } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant";
import { db } from "@/db";
import { products, customers, orders } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveDateRange } from "@/lib/date-range";
import { DateRangeFilter } from "@/components/dashboard/filters/date-range-filter";

/**
 * Products, Customers, and Store Status are current-state figures -- they
 * don't bucket by date, so the shared date-range filter never touches them.
 * Total Paid Sales, Total Orders, and Pending Orders are all scoped to
 * orders.createdAt within the selected range.
 */
async function getOverviewStats(
  storeId: string,
  range: { from?: Date | null; to?: Date | null }
) {
  const dc = [];
  if (range.from) dc.push(gte(orders.createdAt, range.from));
  if (range.to) dc.push(lte(orders.createdAt, range.to));

  const [
    [productCount],
    [customerCount],
    [totalOrdersCount],
    [pendingOrderCount],
    [paidSalesSum],
  ] = await Promise.all([
    db.select({ value: count() }).from(products).where(eq(products.storeId, storeId)),
    db.select({ value: count() }).from(customers).where(eq(customers.storeId, storeId)),
    db
      .select({ value: count() })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), ...dc)),
    db
      .select({ value: count() })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.fulfillmentStatus, "NEW"), ...dc)),
    db
      .select({ value: sum(orders.total) })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.paymentStatus, "PAID"), ...dc)),
  ]);

  return {
    products: productCount?.value ?? 0,
    customers: customerCount?.value ?? 0,
    totalOrders: totalOrdersCount?.value ?? 0,
    pendingOrders: pendingOrderCount?.value ?? 0,
    totalSales: paidSalesSum?.value ? parseFloat(paidSalesSum.value) : 0,
  };
}

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { store } = await getCurrentStore();
  const sp = await searchParams;
  const dateRange = resolveDateRange(sp);
  const stats = await getOverviewStats(store.id, dateRange);

  const cards = [
    {
      label: "Total Paid Sales",
      value: `${store.currencySymbol}${stats.totalSales.toLocaleString()}`,
    },
    { label: "Total Orders", value: stats.totalOrders },
    { label: "Pending Orders", value: stats.pendingOrders },
    { label: "Active Products", value: stats.products },
    { label: "Customers", value: stats.customers },
    { label: "Store Status", value: store.isPublished ? "Live" : "Draft" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">How is {store.name} doing?</h1>
          <p className="text-muted-foreground text-sm">
            {store.isPublished ? "Your store is live." : "Your store isn't published yet."}{" "}
            Sales and order figures below are {dateRange.label.toLowerCase()}.
          </p>
        </div>
        <DateRangeFilter />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-normal">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
