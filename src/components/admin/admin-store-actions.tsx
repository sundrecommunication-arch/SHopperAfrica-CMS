"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS, PLAN_ORDER, PERIOD_DAYS, type PlanKey } from "@/modules/subscriptions/plans";

interface AdminStoreActionsProps {
  storeId: string;
  currentPlan: PlanKey;
  periodEnd: string | null;
  suspended: boolean;
}

function toDateInput(iso: string | null) {
  const d = iso ? new Date(iso) : new Date(Date.now() + PERIOD_DAYS * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function AdminStoreActions({ storeId, currentPlan, periodEnd, suspended }: AdminStoreActionsProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanKey>(currentPlan);
  const [endDate, setEndDate] = useState(toDateInput(currentPlan === "FREE" ? null : periodEnd));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"plan" | "suspend" | null>(null);

  const send = async (body: Record<string, unknown>, kind: "plan" | "suspend", success: string) => {
    setBusy(kind);
    try {
      const res = await fetch(`/api/admin/stores/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      toast.success(success);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const savePlan = () =>
    send(
      {
        action: "set_plan",
        plan,
        // End of the chosen day, so "until 5 Nov" includes 5 Nov.
        periodEnd: plan === "FREE" ? null : new Date(`${endDate}T23:59:59`).toISOString(),
      },
      "plan",
      `Plan set to ${PLANS[plan].name}`
    );

  const toggleSuspend = () => {
    if (!suspended && !confirm("Suspend this store? Its storefront goes offline and it can't take orders.")) return;
    send(
      { action: "suspend", suspended: !suspended, reason: reason || undefined },
      "suspend",
      suspended ? "Store reinstated" : "Store suspended"
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change plan</CardTitle>
          <CardDescription>For comps, refunds or payments received outside Paystack.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PLAN_ORDER.map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={plan === p ? "default" : "outline"}
                onClick={() => setPlan(p)}
              >
                {PLANS[p].name}
              </Button>
            ))}
          </div>
          {plan !== "FREE" && (
            <div className="space-y-1.5">
              <Label htmlFor="endDate">Active until</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="max-w-xs"
              />
            </div>
          )}
          <Button onClick={savePlan} disabled={busy !== null}>
            {busy === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save plan"}
          </Button>
        </CardContent>
      </Card>

      <Card className={suspended ? "border-destructive/40" : ""}>
        <CardHeader>
          <CardTitle className="text-base">{suspended ? "Store is suspended" : "Suspend store"}</CardTitle>
          <CardDescription>
            {suspended
              ? "The storefront shows \"temporarily unavailable\" and can't take orders. Nothing has been deleted."
              : "Takes the storefront offline and blocks new orders. Nothing is deleted; you can reinstate it any time."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!suspended && (
            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason (internal)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Reported for fraud"
              />
            </div>
          )}
          <Button
            variant={suspended ? "default" : "destructive"}
            onClick={toggleSuspend}
            disabled={busy !== null}
          >
            {busy === "suspend" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : suspended ? (
              "Reinstate store"
            ) : (
              "Suspend store"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
