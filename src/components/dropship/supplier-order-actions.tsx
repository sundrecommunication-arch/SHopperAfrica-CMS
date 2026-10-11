"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SupplierOrderActions({
  supplierOrderId,
  status,
  trackingNote,
}: {
  supplierOrderId: string;
  status: string;
  trackingNote: string | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState(trackingNote ?? "");
  const [busy, setBusy] = useState<string | null>(null);

  async function move(next: "ACCEPTED" | "SHIPPED" | "DELIVERED") {
    setBusy(next);
    try {
      const res = await fetch(`/api/supplier/orders/${supplierOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, trackingNote: note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not update");
      toast.success(next === "SHIPPED" ? "Marked as shipped — the customer has been told" : next === "DELIVERED" ? "Marked as delivered" : "Order accepted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update");
    } finally {
      setBusy(null);
    }
  }

  if (status === "DELIVERED" || status === "CANCELLED") {
    return trackingNote ? <p className="text-sm text-muted-foreground">Delivery note: {trackingNote}</p> : null;
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Update this order</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {status !== "SHIPPED" && (
          <div className="space-y-1.5">
            <Label htmlFor="note">Delivery company & tracking (optional)</Label>
            <Input id="note" placeholder="e.g. GIG Logistics, waybill 123456" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {status === "NEW" && (
            <Button variant="outline" onClick={() => move("ACCEPTED")} disabled={busy !== null}>
              {busy === "ACCEPTED" ? <Loader2 className="size-4 animate-spin" /> : "Accept — preparing it"}
            </Button>
          )}
          {(status === "NEW" || status === "ACCEPTED") && (
            <Button onClick={() => move("SHIPPED")} disabled={busy !== null}>
              {busy === "SHIPPED" ? <Loader2 className="size-4 animate-spin" /> : "Mark as shipped"}
            </Button>
          )}
          {status === "SHIPPED" && (
            <Button onClick={() => move("DELIVERED")} disabled={busy !== null}>
              {busy === "DELIVERED" ? <Loader2 className="size-4 animate-spin" /> : "Mark as delivered"}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Can&apos;t deliver this order? Contact admin@shopperafrica.com straight away so the customer can be refunded.</p>
      </CardContent>
    </Card>
  );
}
