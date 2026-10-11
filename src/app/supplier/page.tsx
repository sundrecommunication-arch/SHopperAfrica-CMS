import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, ne, sql } from "drizzle-orm";
import { CheckCircle2, Circle, Clock, PackagePlus, Truck, Wallet } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/db";
import { supplierOrders, supplierProducts } from "@/db/schema";
import { getSupplierForUser, listSupplierOrders } from "@/modules/dropship/services/supplier-service";
import { getPayoutAccount } from "@/modules/dropship/services/payout-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierOrderStatusBadge } from "@/components/dropship/supplier-order-status";

export default async function SupplierOverviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/supplier");
  const supplier = await getSupplierForUser(session.user.id);
  if (!supplier) redirect("/supplier/apply");

  if (supplier.status !== "APPROVED") {
    const copy = {
      PENDING: {
        title: "Application received",
        body: "Thanks! We review new suppliers within 1-2 working days and will email you as soon as you're approved. You can then add your products and bank account.",
      },
      REJECTED: {
        title: "We couldn't approve your application yet",
        body: "You can update your details and send them again.",
      },
      SUSPENDED: {
        title: "Your supplier account is paused",
        body: "Your products aren't available to stores right now. Reply to any Shopper email or contact admin@shopperafrica.com.",
      },
    }[supplier.status];
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5 text-amber-600" /> {copy.title}
          </CardTitle>
          <CardDescription>{copy.body}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {supplier.statusNote && (
            <p className="rounded-lg bg-muted p-3 text-sm">
              <strong>Note from Shopper:</strong> {supplier.statusNote}
            </p>
          )}
          {supplier.status !== "SUSPENDED" && (
            <Button asChild variant="outline">
              <Link href="/supplier/apply">Edit your details</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const [payout, [stats], orders] = await Promise.all([
    getPayoutAccount({ supplierId: supplier.id }),
    db
      .select({
        products: sql<number>`(select count(*) from ${supplierProducts} where ${supplierProducts.supplierId} = ${supplier.id} and ${supplierProducts.isActive})`.mapWith(Number),
        toShip: sql<number>`count(*) filter (where ${supplierOrders.status} in ('NEW', 'ACCEPTED'))`.mapWith(Number),
        earned: sql<string>`coalesce(sum(${supplierOrders.amountDue}), 0)`,
      })
      .from(supplierOrders)
      .where(and(eq(supplierOrders.supplierId, supplier.id), ne(supplierOrders.status, "CANCELLED"))),
    listSupplierOrders(supplier.id),
  ]);

  const steps = [
    { done: Boolean(payout), label: "Add your bank account", href: "/supplier/payouts", hint: "So you're paid automatically for every order." },
    { done: stats.products > 0, label: "Add your first product", href: "/supplier/products/new", hint: "Stores can only sell what you list." },
  ];
  const setupDone = steps.every((s) => s.done);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {supplier.businessName}</h1>
        <p className="text-sm text-muted-foreground">Stores sell your products — you deliver, and you&apos;re paid automatically.</p>
      </div>

      {!setupDone && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Finish setting up</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {steps.map((s) => (
              <Link key={s.label} href={s.href} className="flex items-center gap-3 py-3 hover:opacity-80">
                {s.done ? <CheckCircle2 className="size-5 text-green-600" /> : <Circle className="size-5 text-muted-foreground" />}
                <div>
                  <p className={`text-sm font-medium ${s.done ? "text-muted-foreground line-through" : ""}`}>{s.label}</p>
                  {!s.done && <p className="text-xs text-muted-foreground">{s.hint}</p>}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 pt-6"><Truck className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">To deliver</p><p className="text-xl font-semibold">{stats.toShip}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6"><PackagePlus className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Live products</p><p className="text-xl font-semibold">{stats.products}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6"><Wallet className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Earned so far</p><p className="text-xl font-semibold">₦{Number(stats.earned).toLocaleString()}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Recent orders</CardTitle>
          <Link href="/supplier/orders" className="text-sm text-primary hover:underline">All orders</Link>
        </CardHeader>
        <CardContent className="divide-y text-sm">
          {orders.length === 0 && <p className="text-muted-foreground">No orders yet. Once stores add your products and sell them, orders appear here and you get an email.</p>}
          {orders.slice(0, 5).map((o) => (
            <Link key={o.id} href={`/supplier/orders/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
              <span>
                <span className="font-medium">{o.orderNumber}</span> · {o.customerName}
                <span className="block text-xs text-muted-foreground">{o.storeName} · {o.createdAt.toLocaleDateString("en-GB")}</span>
              </span>
              <span className="flex items-center gap-2">
                <span>₦{Number(o.amountDue).toLocaleString()}</span>
                <SupplierOrderStatusBadge status={o.status} />
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
