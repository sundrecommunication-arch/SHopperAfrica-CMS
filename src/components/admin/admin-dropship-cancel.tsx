"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AdminDropshipCancel({ supplierOrderId }: { supplierOrderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function cancel() {
    if (
      !confirm(
        "Have you refunded the customer in the Paystack dashboard (Transactions → this payment → Refund)?\n\nThis cancels the supplier order and, if nothing else is left to deliver, cancels the order and emails the customer."
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/admin/dropship/${supplierOrderId}`, { method: "PATCH" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(data.error ?? "Could not cancel");
    toast.success("Cancelled");
    router.refresh();
  }

  return (
    <Button size="sm" variant="outline" onClick={cancel} disabled={busy} className="shrink-0">
      Refunded — cancel order
    </Button>
  );
}
