"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle, Loader2, Clock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildAbandonedCartNudgeUrl } from "@/modules/storefront/utils/whatsapp";

interface AbandonedCheckoutItem {
  name: string;
  variantName: string | null;
  quantity: number;
}

interface AbandonedCheckout {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: string;
  paymentMethod: string | null;
  customerName: string;
  customerPhone: string;
  items: AbandonedCheckoutItem[];
  lastNudgeAt: string | null;
  nudgeCount: number;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return "less than an hour ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AbandonedCartsList({
  checkouts,
  storeName,
  currencySymbol,
}: {
  checkouts: AbandonedCheckout[];
  storeName: string;
  currencySymbol: string;
}) {
  const router = useRouter();
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function nudge(checkout: AbandonedCheckout) {
    const url = buildAbandonedCartNudgeUrl({
      customerPhone: checkout.customerPhone,
      customerName: checkout.customerName,
      storeName,
      orderNumber: checkout.orderNumber,
      items: checkout.items,
      total: parseFloat(checkout.total),
      currencySymbol,
    });

    // Open WhatsApp synchronously in the click handler — doing this after an
    // await would get the popup blocked by the browser.
    window.open(url, "_blank", "noopener,noreferrer");

    setSendingId(checkout.id);
    try {
      const res = await fetch(`/api/orders/${checkout.id}/nudge`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Opened WhatsApp, but couldn't log the nudge.");
        return;
      }
      toast.success("WhatsApp opened — nudge logged.");
      router.refresh();
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {checkouts.map((checkout) => (
        <Card key={checkout.id}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold">{checkout.orderNumber}</span>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Clock className="h-3 w-3" />
                  {timeAgo(checkout.createdAt)}
                </Badge>
                {checkout.paymentMethod && (
                  <Badge variant="secondary" className="text-[10px]">
                    {checkout.paymentMethod}
                  </Badge>
                )}
              </div>
              <div className="text-sm font-medium">{checkout.customerName}</div>
              <div className="text-muted-foreground text-xs">{checkout.customerPhone}</div>
              <div className="text-muted-foreground text-xs">
                {checkout.items.map((item, idx) => (
                  <span key={idx}>
                    {item.quantity}× {item.name}
                    {item.variantName ? ` (${item.variantName})` : ""}
                    {idx < checkout.items.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
              {checkout.nudgeCount > 0 && checkout.lastNudgeAt && (
                <div className="text-[11px] text-muted-foreground">
                  Nudged {checkout.nudgeCount}× — last {timeAgo(checkout.lastNudgeAt)}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="text-sm font-semibold">
                {currencySymbol}
                {parseFloat(checkout.total).toLocaleString()}
              </span>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => nudge(checkout)}
                disabled={sendingId === checkout.id}
              >
                {sendingId === checkout.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MessageCircle className="h-3.5 w-3.5" />
                )}
                {checkout.nudgeCount > 0 ? "Nudge again" : "Nudge on WhatsApp"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
