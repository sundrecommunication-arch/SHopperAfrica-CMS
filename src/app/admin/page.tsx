import Link from "next/link";
import { getPlatformOverview } from "@/modules/admin/services/admin-service";
import { PLANS, PLAN_ORDER, formatNaira } from "@/modules/subscriptions/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  const o = await getPlatformOverview();
  const totalOrders = o.salesByCurrency.reduce((n, r) => n + r.orders, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Overview</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Stores"
          value={o.stores.total.toLocaleString()}
          hint={`${o.stores.published} published · ${o.stores.suspended} suspended`}
        />
        <Stat label="User accounts" value={o.users.toLocaleString()} />
        <Stat label="Plan revenue (30 days)" value={formatNaira(o.revenueLast30)} hint={`${formatNaira(o.revenueAllTime)} all time`} />
        <Stat label="Orders on Shopper" value={totalOrders.toLocaleString()} hint="excluding cancelled" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stores by plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {PLAN_ORDER.map((p) => (
              <div key={p} className="flex justify-between">
                <span>{PLANS[p].name}</span>
                <span className="font-medium">{o.planCounts[p]}</span>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">{o.trials} on a trial</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Merchant sales (all stores)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {o.salesByCurrency.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
            {o.salesByCurrency.map((r) => (
              <div key={r.currency} className="flex justify-between">
                <span>{r.currency} · {r.orders} orders</span>
                <span className="font-medium">{r.sales.toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Newest stores</CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            {o.recentStores.map((s) => (
              <Link key={s.id} href={`/admin/stores/${s.id}`} className="flex justify-between py-2 hover:underline">
                <span>{s.name}</span>
                <span className="text-muted-foreground">{s.createdAt.toLocaleDateString("en-GB")}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest plan payments</CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            {o.recentPayments.length === 0 && <p className="text-muted-foreground">None yet.</p>}
            {o.recentPayments.map((p) => (
              <Link key={p.id} href={`/admin/stores/${p.storeId}`} className="flex justify-between py-2 hover:underline">
                <span>{p.storeName} — {PLANS[p.plan].name}</span>
                <span className="font-medium">{formatNaira(parseFloat(p.amount))}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
