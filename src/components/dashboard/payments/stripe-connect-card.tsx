"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, ExternalLink, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  /** Why Stripe can't be used yet (plan, currency, not switched on); null when it can. */
  blockedReason: string | null;
  connection: { chargesEnabled: boolean; detailsSubmitted: boolean; disconnected: boolean } | null;
  error?: string | null;
}

// Card payments for UK/US/Canada stores: the merchant connects their own
// Stripe account (Stripe-hosted signup), then customers can pay by card.
export function StripeConnectCard({ blockedReason, connection, error }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const live = Boolean(connection?.chargesEnabled && !connection.disconnected);

  async function disconnect() {
    if (!confirm("Stop taking card payments? Your Stripe account stays yours; you can reconnect anytime.")) return;
    setBusy(true);
    const res = await fetch("/api/payments/stripe/disconnect", { method: "POST" });
    setBusy(false);
    if (!res.ok) return toast.error("Couldn't update. Please try again.");
    toast.success("Card payments turned off");
    router.refresh();
  }

  return (
    <Card className={live ? "border-emerald-300 dark:border-emerald-900" : undefined}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Card payments (Stripe)</CardTitle>
            <CardDescription>
              Customers pay by debit or credit card, Apple Pay or Google Pay. Money goes straight to your own Stripe account
              and on to your bank. Stripe&apos;s standard card fees apply.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {error && <p className="text-destructive">{error}</p>}
        {blockedReason ? (
          <p className="text-muted-foreground">{blockedReason}</p>
        ) : live ? (
          <>
            <p className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Card payments are on. Customers see &ldquo;Card payment&rdquo; at checkout.
            </p>
            <p className="text-muted-foreground">Refunds, disputes and payouts are handled in your Stripe dashboard.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">
                  Open Stripe dashboard <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </a>
              </Button>
              <Button variant="ghost" size="sm" onClick={disconnect} disabled={busy}>
                {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                Turn off card payments
              </Button>
            </div>
          </>
        ) : connection && !connection.disconnected ? (
          <>
            <p className="text-muted-foreground">
              {connection.detailsSubmitted
                ? "Stripe is checking your details. This usually takes a few minutes; card payments switch on automatically."
                : "Your Stripe account is created but not finished. Complete the signup to start taking card payments."}
            </p>
            <div className="flex flex-wrap gap-2">
              {!connection.detailsSubmitted && (
                <Button asChild size="sm">
                  <a href="/api/payments/stripe/onboard">Finish Stripe signup</a>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <a href="/dashboard/payments?stripe=return">Check again</a>
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              Takes about 5 minutes on Stripe: your business details, ID and the bank account you want paid into.
              {connection?.disconnected && " Your existing Stripe account will be reconnected."}
            </p>
            <Button asChild size="sm">
              <a href="/api/payments/stripe/onboard">{connection?.disconnected ? "Turn card payments back on" : "Connect with Stripe"}</a>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
