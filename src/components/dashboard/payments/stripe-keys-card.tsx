"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Copy, CreditCard, ExternalLink, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  /** Why Stripe can't be used yet (plan, currency); null when it can. */
  blockedReason: string | null;
  setup: { enabled: boolean; keyHint: string; livemode: boolean; hasWebhook: boolean } | null;
  /** This store's webhook endpoint, for the optional webhook step. */
  webhookUrl: string;
}

// Card payments for UK/US/Canada stores using the merchant's OWN Stripe
// account and key (like Paystack keys) -- Shopper needs no Stripe account.
export function StripeKeysCard({ blockedReason, setup, webhookUrl }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(!setup);
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/payments/stripe/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secretKey, webhookSecret: webhookSecret || null }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) return toast.error(data?.error ?? "Couldn't save. Please try again.");
    toast.success("Stripe connected. Customers can now pay by card.");
    setSecretKey("");
    setWebhookSecret("");
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Stop taking card payments and remove your Stripe key from Shopper?")) return;
    setBusy(true);
    const res = await fetch("/api/payments/stripe/keys", { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return toast.error("Couldn't update. Please try again.");
    toast.success("Stripe removed");
    setEditing(true);
    router.refresh();
  }

  return (
    <Card className={setup?.enabled ? "border-emerald-300 dark:border-emerald-900" : undefined}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Card payments (Stripe)</CardTitle>
            <CardDescription>
              Customers pay by debit or credit card, Apple Pay or Google Pay on Stripe&apos;s secure page. Money goes
              straight to your Stripe account and on to your bank. Shopper takes no cut; Stripe&apos;s normal fees apply.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {blockedReason ? (
          <p className="text-muted-foreground">{blockedReason}</p>
        ) : setup && !editing ? (
          <>
            <p className="flex flex-wrap items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Card payments are on (key ending {setup.keyHint}).
              {!setup.livemode && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Test mode: no real money
                </span>
              )}
            </p>
            <p className="text-muted-foreground">
              Refunds, disputes and payouts are handled in your Stripe dashboard.
              {setup.hasWebhook ? " Webhook connected." : " Payments are confirmed when customers return to your shop, and checked again every hour."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">
                  Open Stripe dashboard <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Change key
              </Button>
              <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
                Remove
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <ol className="text-muted-foreground list-decimal space-y-1 pl-5">
              <li>
                Sign up or log in at{" "}
                <a href="https://dashboard.stripe.com/register" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                  stripe.com
                </a>{" "}
                and finish activating your account (business details and bank account).
              </li>
              <li>
                Go to <strong>Developers → API keys → Create restricted key</strong>. Name it &ldquo;Shopper&rdquo;, set{" "}
                <strong>Checkout Sessions</strong> to <strong>Write</strong>, and create it.
              </li>
              <li>Copy the key (it starts with rk_live_) and paste it below.</li>
            </ol>
            <div className="space-y-2">
              <Label htmlFor="stripeKey">Stripe restricted key</Label>
              <Input
                id="stripeKey"
                type="password"
                autoComplete="off"
                placeholder="rk_live_..."
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                A secret key (sk_live_...) also works, but a restricted key is safer: it can only create checkout pages.
              </p>
            </div>
            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer font-medium">Optional: instant confirmation with a webhook</summary>
              <div className="mt-3 space-y-2 text-muted-foreground">
                <p>
                  In Stripe, go to <strong>Developers → Webhooks → Add endpoint</strong>, paste this URL and choose the events{" "}
                  <code>checkout.session.completed</code> and <code>checkout.session.async_payment_succeeded</code>:
                </p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{webhookUrl}</code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => navigator.clipboard?.writeText(webhookUrl).then(() => toast.success("Copied"))}
                    aria-label="Copy webhook URL"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p>Then paste the endpoint&apos;s signing secret here:</p>
                <Input
                  type="password"
                  autoComplete="off"
                  placeholder="whsec_..."
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                />
              </div>
            </details>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy || !secretKey.trim()}>
                {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                Check and save
              </Button>
              {setup && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
