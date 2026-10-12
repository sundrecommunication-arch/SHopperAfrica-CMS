import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import { requireApprovedSupplierPage } from "../../supplier-page";
import { getSupplierOrder } from "@/modules/dropship/services/supplier-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierOrderStatusBadge } from "@/components/dropship/supplier-order-status";
import { SupplierOrderActions } from "@/components/dropship/supplier-order-actions";

export default async function SupplierOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const supplier = await requireApprovedSupplierPage();
  const { id } = await params;
  const o = await getSupplierOrder(supplier.id, id);
  if (!o) notFound();
  const tel = o.customerPhone.replace(/[^\d+]/g, "");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/supplier/orders" className="-mb-3 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All orders
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Order {o.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Sold by {o.storeName} · {o.so.createdAt.toLocaleString("en-GB")}
          </p>
        </div>
        <SupplierOrderStatusBadge status={o.so.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Deliver to</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{o.customerName}</p>
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> {o.deliveryAddressText}</p>
            <a href={`tel:${tel}`} className="flex items-center gap-2 text-primary hover:underline"><Phone className="size-4" /> {o.customerPhone}</a>
            {o.customerNotes && <p className="rounded bg-muted p-2 text-xs"><strong>Customer note:</strong> {o.customerNotes}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
          <CardContent className="divide-y text-sm">
            {o.items.map((i, idx) => (
              <div key={idx} className="flex justify-between py-2">
                <span>{i.quantity} × {i.productName}{i.variantName ? ` (${i.variantName})` : ""}</span>
                <span>₦{(Number(i.supplierUnitCost) * i.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 font-semibold">
              <span>You receive</span>
              <span>₦{Number(o.so.amountDue).toLocaleString()}</span>
            </div>
            <p className="pt-2 text-xs text-muted-foreground">Already paid by the customer — sent to your bank automatically.</p>
          </CardContent>
        </Card>
      </div>

      <SupplierOrderActions supplierOrderId={o.so.id} status={o.so.status} trackingNote={o.so.trackingNote} problemNote={o.so.problemNote} />
    </div>
  );
}
