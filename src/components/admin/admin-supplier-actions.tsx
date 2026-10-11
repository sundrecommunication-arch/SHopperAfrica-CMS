"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AdminSupplierActions({ supplierId, status }: { supplierId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(next: "APPROVED" | "REJECTED" | "SUSPENDED") {
    let note: string | undefined;
    if (next !== "APPROVED") {
      const input = prompt(next === "REJECTED" ? "Reason (sent to the supplier):" : "Reason for suspending (sent to the supplier):");
      if (input === null) return;
      note = input;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/suppliers/${supplierId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, note }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(data.error ?? "Update failed");
    toast.success(`Supplier ${next.toLowerCase()} — they've been emailed`);
    router.refresh();
  }

  return (
    <div className="flex shrink-0 gap-2">
      {status !== "APPROVED" && (
        <Button size="sm" onClick={() => set("APPROVED")} disabled={busy}>
          Approve
        </Button>
      )}
      {status === "PENDING" && (
        <Button size="sm" variant="outline" onClick={() => set("REJECTED")} disabled={busy}>
          Reject
        </Button>
      )}
      {status === "APPROVED" && (
        <Button size="sm" variant="destructive" onClick={() => set("SUSPENDED")} disabled={busy}>
          Suspend
        </Button>
      )}
    </div>
  );
}
