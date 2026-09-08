import { eq, and, count } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant";
import { db } from "@/db";
import { products, customers, orders } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getOverviewStats(storeId: string) {
  const [[productCount], [customerCount], [pendingOrderCount], [lowStockCount]] = await Promise.all([
    db.select({ value: count() }).from(products).where(eq(products.storeId, storeId)),
    db.select({ value: count() }).from(customers).where(eq(customers.storeId, storeId)),
    db
      .select({ value: count() })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.fulfillmentStatus, "NEW"))),
    db
      .select({ value: count() })
      .from(products)
      .where(and(eq(products.storeId, storeId), eq(products.trackInventory, true))),
  ]);

  return {
    products: productCount?.value ?? 0,
    customers: customerCount?.value ?? 0,
    pendingOrders: pendingOrderCount?.value ?? 0,
    lowStockCandidates: lowStockCount?.value ?? 0,
  };
}

export default async function DashboardOverviewPage() {
  const { store } = await getCurrentStore();
  const stats = await getOverviewStats(store.id);

  const cards = [
    { label: "Today's sales", value: `${store.currencySymbol}0` },
    { label: "Orders today", value: "0" },
    { label: "Pending orders", value: stats.pendingOrders },
    { label: "Products", value: stats.products },
    { label: "Customers", value: stats.customers },
    { label: "Low-stock products", value: "—" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">How is {store.name} doing?</h1>
        <p className="text-muted-foreground text-sm">
          {store.isPublished ? "Your store is live." : "Your store isn't published yet."}
        </p>
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
