"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Paystack redirects back to this receipt page (via the callback_url we set
 * in /api/payments/initialize) with ?reference=&trxref= query params, before
 * the webhook has necessarily landed. This runs once on arrival to verify
 * the payment immediately, so the customer doesn't sit looking at "Pending"
 * for however long the webhook takes.
 */
export function PaystackPaymentVerifier({
  storeSlug,
  orderNumber,
  isPending,
}: {
  storeSlug: string;
  orderNumber: string;
  isPending: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (!reference || !isPending || attempted.current) return;
    attempted.current = true;
    setIsVerifying(true);

    fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeSlug, orderNumber, reference }),
    })
      .then((res) => res.json().catch(() => null))
      .then((data) => {
        if (data?.success) {
          toast.success("Payment confirmed!");
        }
        router.refresh();
      })
      .finally(() => setIsVerifying(false));
  }, [searchParams, isPending, storeSlug, orderNumber, router]);

  if (!isVerifying) return null;

  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Confirming your payment…
    </div>
  );
}

/**
 * Lets a customer resume payment for an order that's still PENDING on
 * Paystack — e.g. they closed the tab, or the redirect back here happened
 * before payment actually completed.
 */
export function PaystackRetryButton({
  storeSlug,
  orderNumber,
}: {
  storeSlug: string;
  orderNumber: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug, orderNumber }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.authorizationUrl) {
        toast.error(data?.error ?? "Could not start payment");
        setIsLoading(false);
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch {
      toast.error("Could not start payment");
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-2 py-4 text-sm font-semibold"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="h-4 w-4" />
      )}
      Complete Card Payment
    </Button>
  );
}
