"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface OrderStatusActionsProps {
  orderId: string;
  currentFulfillmentStatus: string;
  currentPaymentStatus: string;
}

export function OrderStatusActions({
  orderId,
  currentFulfillmentStatus,
  currentPaymentStatus,
}: OrderStatusActionsProps) {
  const router = useRouter();
  const [fulfillment, setFulfillment] = useState(currentFulfillmentStatus);
  const [payment, setPayment] = useState(currentPaymentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillmentStatus: fulfillment,
          paymentStatus: payment,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update order status");

      toast.success("Order status updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error updating order");
    } finally {
      setIsUpdating(false);
    }
  };

  const hasChanges =
    fulfillment !== currentFulfillmentStatus || payment !== currentPaymentStatus;

  return (
    <div className="flex flex-col sm:flex-row items-end gap-3">
      <div className="w-full sm:w-44 space-y-1.5">
        <Label className="text-xs">Fulfillment Status</Label>
        <Select value={fulfillment} onValueChange={setFulfillment}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NEW">NEW</SelectItem>
            <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
            <SelectItem value="PROCESSING">PROCESSING</SelectItem>
            <SelectItem value="READY">READY</SelectItem>
            <SelectItem value="SHIPPED">SHIPPED</SelectItem>
            <SelectItem value="DELIVERED">DELIVERED</SelectItem>
            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full sm:w-44 space-y-1.5">
        <Label className="text-xs">Payment Status</Label>
        <Select value={payment} onValueChange={setPayment}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">PENDING</SelectItem>
            <SelectItem value="PAID">PAID</SelectItem>
            <SelectItem value="FAILED">FAILED</SelectItem>
            <SelectItem value="REFUNDED">REFUNDED</SelectItem>
            <SelectItem value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleUpdate}
        disabled={!hasChanges || isUpdating}
        size="sm"
        className="h-9"
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Check className="h-4 w-4 mr-1.5" />
            Update Status
          </>
        )}
      </Button>
    </div>
  );
}
