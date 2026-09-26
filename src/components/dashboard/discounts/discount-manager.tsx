"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tag, Plus, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DiscountItem {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: string;
  minOrderAmount?: string | null;
  usageLimit?: number | null;
  usageCount: number;
  expiresAt?: Date | string | null;
  isActive: boolean;
  createdAt: Date | string;
}

interface DiscountManagerProps {
  initialDiscounts: DiscountItem[];
  currencySymbol: string;
}

export function DiscountManager({ initialDiscounts, currencySymbol }: DiscountManagerProps) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form State
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [value, setValue] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter a discount code");
      return;
    }
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal <= 0) {
      toast.error("Please enter a valid discount value");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          type,
          value: numVal,
          minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : undefined,
          usageLimit: usageLimit ? parseInt(usageLimit, 10) : undefined,
          expiresAt: expiresAt || undefined,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create discount");

      toast.success("Discount code created!");
      setCode("");
      setValue("");
      setMinOrderAmount("");
      setUsageLimit("");
      setExpiresAt("");
      setShowCreateForm(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error creating discount");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/discounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(currentActive ? "Discount disabled" : "Discount activated");
      router.refresh();
    } catch {
      toast.error("Error updating discount");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this discount coupon?")) return;
    try {
      const res = await fetch(`/api/discounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete discount");
      toast.success("Discount deleted");
      router.refresh();
    } catch {
      toast.error("Error deleting discount");
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowCreateForm((prev) => !prev)}
          size="sm"
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          {showCreateForm ? "Cancel" : "Create Discount Code"}
        </Button>
      </div>

      {/* Create Form Drawer / Card */}
      {showCreateForm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              New Discount Coupon
            </CardTitle>
            <CardDescription>
              Create a promotional code your customers can enter at checkout.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="code">Coupon Code *</Label>
                  <Input
                    id="code"
                    placeholder="e.g. SUMMER20, WELCOME10"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="font-mono uppercase font-bold"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as "PERCENTAGE" | "FIXED")}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                      <SelectItem value="FIXED">Fixed Amount ({currencySymbol})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">
                    Value * {type === "PERCENTAGE" ? "(%)" : `(${currencySymbol})`}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    step="any"
                    placeholder={type === "PERCENTAGE" ? "20" : "1500"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="minOrder">Min Order Amount (optional)</Label>
                  <Input
                    id="minOrder"
                    type="number"
                    placeholder="e.g. 5000"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usageLimit">Max Uses Limit (optional)</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    placeholder="e.g. 100"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Discount Code"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Discounts Table */}
      {initialDiscounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 px-4 text-center">
          <Tag className="h-12 w-12 text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-semibold">No discount codes yet</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            Create coupon codes to offer promotions and drive sales for your store.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialDiscounts.map((discount) => {
                const isExpired =
                  discount.expiresAt && new Date(discount.expiresAt) < new Date();

                return (
                  <TableRow key={discount.id} className="hover:bg-muted/40">
                    <TableCell className="font-mono font-bold text-xs">
                      {discount.code}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">
                      {discount.type === "PERCENTAGE"
                        ? `${parseFloat(discount.value)}% OFF`
                        : `${currencySymbol}${parseFloat(discount.value).toLocaleString()} OFF`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {discount.usageCount}{" "}
                      {discount.usageLimit ? `/ ${discount.usageLimit}` : "used"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {discount.minOrderAmount
                        ? `${currencySymbol}${parseFloat(discount.minOrderAmount).toLocaleString()}`
                        : "None"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {discount.expiresAt
                        ? new Date(discount.expiresAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      {isExpired ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Expired
                        </Badge>
                      ) : discount.isActive ? (
                        <Badge variant="default" className="text-[10px] bg-emerald-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleStatus(discount.id, discount.isActive)}
                          className="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                          {discount.isActive ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(discount.id)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
