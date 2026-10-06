"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS, PLAN_ORDER, formatNaira, type PlanKey } from "@/modules/subscriptions/plans";

interface PlanPickerProps {
  /** The plan the store is entitled to right now. */
  currentPlan: PlanKey;
  /** The plan on record (may have lapsed or be a trial). */
  subscribedPlan: PlanKey;
  isTrial: boolean;
  lapsed: boolean;
}

export function PlanPicker({ currentPlan, subscribedPlan, isTrial, lapsed }: PlanPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);
  const [verifying, setVerifying] = useState(false);
  const verifiedRef = useRef(false);

  // Paystack sends the owner back here with ?reference=... -- confirm it
  // server-side, then drop the query string.
  const reference = searchParams.get("reference");
  useEffect(() => {
    if (!reference || verifiedRef.current) return;
    verifiedRef.current = true;
    setVerifying(true);
    fetch("/api/billing/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.status === "SUCCEEDED") {
          toast.success(`You're on the ${PLANS[data.plan as PlanKey].name} plan. Thank you!`);
        } else {
          toast.error(data.error ?? "That payment didn't go through. You haven't been charged for a plan.");
        }
      })
      .catch(() => toast.error("Couldn't confirm the payment yet. Refresh in a minute."))
      .finally(() => {
        setVerifying(false);
        router.replace("/dashboard/billing");
        router.refresh();
      });
  }, [reference, router]);

  const handleChoose = async (plan: PlanKey) => {
    setPendingPlan(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.authorizationUrl) {
        throw new Error(data.error ?? "Couldn't start the payment");
      }
      window.location.assign(data.authorizationUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't start the payment");
      setPendingPlan(null);
    }
  };

  return (
    <div className="space-y-4">
      {verifying && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Confirming your payment...
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((key) => {
          const plan = PLANS[key];
          const isCurrent = key === currentPlan;
          // Paying for the plan you already have (or trial) = renew/extend.
          const isRenewal = key !== "FREE" && key === subscribedPlan && !isTrial && !lapsed;
          return (
            <Card key={key} className={isCurrent ? "border-primary ring-1 ring-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {isCurrent && <Badge>{isTrial ? "Trial" : "Current"}</Badge>}
                </div>
                <CardDescription>{plan.tagline}</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold">{formatNaira(plan.priceMonthly)}</span>
                  <span className="text-sm text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                {key !== "FREE" && (
                  <Button
                    className="w-full"
                    variant={isCurrent && !isTrial ? "outline" : "default"}
                    disabled={pendingPlan !== null || verifying}
                    onClick={() => handleChoose(key)}
                  >
                    {pendingPlan === key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isRenewal ? (
                      "Add 30 days"
                    ) : (
                      `Get ${plan.name}`
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Plans are paid 30 days at a time through Paystack — no automatic charges. When a period ends
        your store moves to the Free plan; nothing is deleted.
      </p>
    </div>
  );
}
