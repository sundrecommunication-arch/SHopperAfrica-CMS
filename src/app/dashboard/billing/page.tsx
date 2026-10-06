import React, { Suspense } from "react";
import { getCurrentStore } from "@/lib/tenant";
import {
  getStorePlan,
  listPlanPayments,
} from "@/modules/subscriptions/services/subscription-service";
import { PLANS, formatNaira } from "@/modules/subscriptions/plans";
import { PlanPicker } from "@/components/dashboard/billing/plan-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function BillingPage() {
  const { store, role } = await getCurrentStore();

  if (role !== "OWNER") {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-muted-foreground text-sm">Only the store owner can manage the plan.</p>
      </div>
    );
  }

  const [plan, payments] = await Promise.all([getStorePlan(store.id), listPlanPayments(store.id)]);
  const paid = payments.filter((p) => p.status === "SUCCEEDED").reverse();

  let status: string;
  if (plan.lapsed) {
    status = `Your ${PLANS[plan.subscribedPlan].name} ${plan.isTrial ? "trial" : "plan"} ended on ${formatDate(plan.currentPeriodEnd!)}. You're on the Free plan.`;
  } else if (plan.plan === "FREE") {
    status = "You're on the Free plan.";
  } else {
    status = `You're on the ${PLANS[plan.plan].name} ${plan.isTrial ? "trial" : "plan"} until ${formatDate(plan.currentPeriodEnd!)}.`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-muted-foreground text-sm">{status}</p>
      </div>

      <Suspense>
        <PlanPicker
          currentPlan={plan.plan}
          subscribedPlan={plan.subscribedPlan}
          isTrial={plan.isTrial}
          lapsed={plan.lapsed}
        />
      </Suspense>

      {paid.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment history</CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            {paid.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2">
                <span>
                  {PLANS[p.plan].name} — {p.paidAt ? formatDate(p.paidAt) : ""}
                </span>
                <span className="font-medium">{formatNaira(parseFloat(p.amount))}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
