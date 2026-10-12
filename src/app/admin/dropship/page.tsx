import Link from "next/link";
import { listDropshipOrdersForAdmin } from "@/modules/dropship/services/fulfilment-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SupplierOrderStatusBadge } from "@/components/dropship/supplier-order-status";
import { AdminDropshipCancel } from "@/components/admin/admin-dropship-cancel";

export default async function AdminDropshipPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const filter = view === "all" ? "all" : "attention";
  const rows = await listDropshipOrdersForAdmin(filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dropship orders</h1>
          <p className="text-sm text-muted-foreground">
            {filter === "attention"
              ? "Paid orders a supplier hasn't shipped after 2 days, or reported they can't deliver."
              : "Every supplier order, newest first."}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/dropship" className={`rounded-md border px-3 py-1.5 ${filter === "attention" ? "bg-foreground text-background" : ""}`}>
            Needs attention
          </Link>
          <Link href="/admin/dropship?view=all" className={`rounded-md border px-3 py-1.5 ${filter === "all" ? "bg-foreground text-background" : ""}`}>
            All
          </Link>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{filter === "attention" ? "Nothing needs attention. 🎉" : "No dropship orders yet."}</p>
      )}
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <Card key={r.id} className={r.problemNote ? "border-destructive/50" : r.late ? "border-amber-500/50" : ""}>
            <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6 text-sm">
              <div className="min-w-0 space-y-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {r.orderNumber} · {r.storeName}
                  <SupplierOrderStatusBadge status={r.status} />
                  {r.late && <Badge variant="destructive">Late</Badge>}
                </p>
                <p className="text-muted-foreground">
                  Supplier: {r.supplierName} ({r.supplierPhone}) · owed ₦{Number(r.amountDue).toLocaleString()} of ₦
                  {Number(r.orderTotal).toLocaleString()} · paid {r.createdAt.toLocaleString("en-GB")}
                </p>
                {r.problemNote && <p className="text-destructive">Supplier can&apos;t deliver: “{r.problemNote}”</p>}
                {r.trackingNote && <p className="text-muted-foreground">Tracking: {r.trackingNote}</p>}
                {r.paymentReference && <p className="text-xs text-muted-foreground">Paystack reference: {r.paymentReference}</p>}
              </div>
              {(r.status === "NEW" || r.status === "ACCEPTED") && <AdminDropshipCancel supplierOrderId={r.id} />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
