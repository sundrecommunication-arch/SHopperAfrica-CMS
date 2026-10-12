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
  problemNote = null,
}: {
  supplierOrderId: string;
  status: string;
  trackingNote: string | null;
  problemNote?: string | null;
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

  async function reportProblem() {
    const reason = prompt("Why can't you deliver this order? (e.g. out of stock, can't reach the customer)");
    if (!reason) return;
    setBusy("PROBLEM");
    try {
      const res = await fetch(`/api/supplier/orders/${supplierOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send");
      toast.success("Thanks — Shopper will sort it out with the store and customer");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send");
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
        {problemNote ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            You reported a problem: “{problemNote}”. The Shopper team will contact you and refund the customer if needed.
          </p>
        ) : (
          (status === "NEW" || status === "ACCEPTED") && (
            <Button type="button" variant="ghost" size="sm" className="px-0 text-destructive" onClick={reportProblem} disabled={busy !== null}>
              {busy === "PROBLEM" ? <Loader2 className="size-4 animate-spin" /> : "Can't deliver this order?"}
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}
