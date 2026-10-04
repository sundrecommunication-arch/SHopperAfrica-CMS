"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Both Paystack and PayDunya redirect back to this receipt page (via the
 * callback/return URL we set in /api/payments/initialize), before the
 * webhook has necessarily landed. This runs once on arrival whenever the
 * order is still PENDING, so the customer doesn't sit looking at "Pending"
 * for however long the webhook takes.
 *
 * Despite the name (kept to avoid a wider rename), this now covers either
 * online provider -- /api/payments/verify resolves which one, and the
 * transaction reference to check, from our own DB record of the order's
 * payment attempt rather than from the URL. Paystack appends ?reference=&
 * trxref= to the redirect and PayDunya doesn't append anything reliable at
 * all, so neither is something we parse here anymore.
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
  const [isVerifying, setIsVerifying] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (!isPending || attempted.current) return;
    attempted.current = true;
    setIsVerifying(true);

    fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeSlug, orderNumber }),
    })
      .then((res) => res.json().catch(() => null))
      .then((data) => {
        if (data?.success) {
          toast.success("Payment confirmed!");
        }
        router.refresh();
      })
      .finally(() => setIsVerifying(false));
  }, [isPending, storeSlug, orderNumber, router]);

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
