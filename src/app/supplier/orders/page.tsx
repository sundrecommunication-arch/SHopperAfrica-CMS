import Link from "next/link";
import { requireApprovedSupplierPage } from "../supplier-page";
import { listSupplierOrders } from "@/modules/dropship/services/supplier-service";
import { Card, CardContent } from "@/components/ui/card";
import { SupplierOrderStatusBadge } from "@/components/dropship/supplier-order-status";

export default async function SupplierOrdersPage() {
  const supplier = await requireApprovedSupplierPage();
  const orders = await listSupplierOrders(supplier.id);
  const open = orders.filter((o) => o.status === "NEW" || o.status === "ACCEPTED");
  const done = orders.filter((o) => !(o.status === "NEW" || o.status === "ACCEPTED"));

  const list = (rows: typeof orders) =>
    rows.map((o) => (
      <Link key={o.id} href={`/supplier/orders/${o.id}`} className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-muted/40">
        <span className="min-w-0">
          <span className="font-medium">{o.orderNumber}</span> · {o.customerName}
          <span className="block truncate text-xs text-muted-foreground">
            {o.deliveryAddressText} · {o.createdAt.toLocaleDateString("en-GB")}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span>₦{Number(o.amountDue).toLocaleString()}</span>
          <SupplierOrderStatusBadge status={o.status} />
        </span>
      </Link>
    ));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">To deliver ({open.length})</h2>
        <Card>
          <CardContent className="divide-y p-0">
            {open.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nothing to deliver right now.</p> : list(open)}
          </CardContent>
        </Card>
      </section>
      {done.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Shipped & delivered</h2>
          <Card>
            <CardContent className="divide-y p-0">{list(done)}</CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
