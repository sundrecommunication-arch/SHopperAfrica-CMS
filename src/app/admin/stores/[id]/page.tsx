import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getStoreForAdmin } from "@/modules/admin/services/admin-service";
import { PLANS, formatNaira } from "@/modules/subscriptions/plans";
import { AdminStoreActions } from "@/components/admin/admin-store-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ACTION_LABEL: Record<string, string> = {
  "admin.plan_changed": "Plan changed",
  "admin.store_suspended": "Suspended",
  "admin.store_reinstated": "Reinstated",
};

export default async function AdminStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getStoreForAdmin(id);
  if (!data) notFound();
  const { store, recentOrders, payments, log } = data;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/stores" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> All stores
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">
            {store.ownerName ? `${store.ownerName} · ` : ""}
            {store.ownerEmail} · joined {store.createdAt.toLocaleDateString("en-GB")} · source:{" "}
            {store.ownerSource ?? "direct"}
          </p>
          <Link href={`/store/${store.slug}`} target="_blank" className="text-sm text-primary hover:underline">
            /store/{store.slug} ↗
          </Link>
        </div>
        {store.suspendedAt && (
          <Badge variant="destructive">
            Suspended{store.suspendedReason ? `: ${store.suspendedReason}` : ""}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="pt-6 text-sm"><p className="text-muted-foreground text-xs">Plan</p><p className="font-semibold">{PLANS[store.effectivePlan].name}{store.isTrial && store.effectivePlan !== "FREE" ? " (trial)" : ""}</p>{store.periodEnd && store.effectivePlan !== "FREE" && <p className="text-xs text-muted-foreground">until {store.periodEnd.toLocaleDateString("en-GB")}</p>}</CardContent></Card>
        <Card><CardContent className="pt-6 text-sm"><p className="text-muted-foreground text-xs">Products</p><p className="font-semibold">{store.productCount}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-sm"><p className="text-muted-foreground text-xs">Orders</p><p className="font-semibold">{store.orderCount}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-sm"><p className="text-muted-foreground text-xs">Sales</p><p className="font-semibold">{store.currencySymbol}{store.sales.toLocaleString()}</p></CardContent></Card>
      </div>

      <AdminStoreActions
        storeId={store.id}
        currentPlan={store.effectivePlan}
        periodEnd={store.periodEnd?.toISOString() ?? null}
        suspended={Boolean(store.suspendedAt)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent orders</CardTitle></CardHeader>
          <CardContent className="divide-y text-sm">
            {recentOrders.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
            {recentOrders.map((o) => (
              <div key={o.id} className="flex justify-between py-2">
                <span>{o.orderNumber} · {o.fulfillmentStatus.toLowerCase()} · {o.paymentStatus.toLowerCase()}</span>
                <span>{store.currencySymbol}{parseFloat(o.total).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Plan payments</CardTitle></CardHeader>
          <CardContent className="divide-y text-sm">
            {payments.length === 0 && <p className="text-muted-foreground">None yet.</p>}
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between py-2">
                <span>{PLANS[p.plan].name} · {p.status.toLowerCase()} · {p.createdAt.toLocaleDateString("en-GB")}</span>
                <span>{formatNaira(parseFloat(p.amount))}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Admin activity</CardTitle></CardHeader>
          <CardContent className="divide-y text-sm">
            {log.length === 0 && <p className="text-muted-foreground">No admin actions yet.</p>}
            {log.map((l) => (
              <div key={l.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  {ACTION_LABEL[l.action] ?? l.action}
                  {l.metadata && Object.keys(l.metadata).length > 0 && (
                    <span className="text-muted-foreground"> — {JSON.stringify(l.metadata)}</span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {l.byEmail} · {l.createdAt.toLocaleString("en-GB")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
