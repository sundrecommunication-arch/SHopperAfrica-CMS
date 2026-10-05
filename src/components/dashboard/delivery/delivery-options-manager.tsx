"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Truck, Plus, Trash2, Pencil, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DeliveryOptionItem {
  id: string;
  name: string;
  amount: number;
  freeAboveAmount: number | null;
}

interface DeliveryOptionsManagerProps {
  initialOptions: DeliveryOptionItem[];
  currencySymbol: string;
  canEdit: boolean;
}

export function DeliveryOptionsManager({
  initialOptions,
  currencySymbol,
  canEdit,
}: DeliveryOptionsManagerProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [freeAbove, setFreeAbove] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setAmount("");
    setFreeAbove("");
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (option: DeliveryOptionItem) => {
    setEditingId(option.id);
    setName(option.name);
    setAmount(String(option.amount));
    setFreeAbove(option.freeAboveAmount !== null ? String(option.freeAboveAmount) : "");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please give this delivery option a name");
      return;
    }
    const numAmount = amount.trim() === "" ? 0 : parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      toast.error("Please enter a valid delivery fee (0 for free)");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(editingId ? `/api/shipping/${editingId}` : "/api/shipping", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: numAmount,
          freeAboveAmount: freeAbove ? parseFloat(freeAbove) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save delivery option");

      toast.success(editingId ? "Delivery option updated." : "Delivery option added.");
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error saving delivery option");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this delivery option? Customers won't be able to choose it anymore.")) return;
    try {
      const res = await fetch(`/api/shipping/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete delivery option");
      toast.success("Delivery option removed");
      router.refresh();
    } catch {
      toast.error("Error removing delivery option");
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      {canEdit && (
        <div className="flex justify-end">
          <Button
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Cancel" : "Add Delivery Option"}
          </Button>
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {editingId ? "Edit Delivery Option" : "New Delivery Option"}
            </CardTitle>
            <CardDescription>
              Customers pick one of these at checkout. Use a fee of 0 for free delivery or pickup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Lagos, Abuja, Pickup"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Delivery Fee ({currencySymbol})</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 3000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="freeAbove">Free for orders above (optional)</Label>
                  <Input
                    id="freeAbove"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 100000"
                    value={freeAbove}
                    onChange={(e) => setFreeAbove(e.target.value)}
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
                  ) : editingId ? (
                    "Save Changes"
                  ) : (
                    "Save Delivery Option"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Options Table */}
      {initialOptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 px-4 text-center">
          <Truck className="h-12 w-12 text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-semibold">No delivery options yet</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            Until you add one, checkout won&apos;t charge a delivery fee — you can arrange it with
            each customer directly.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Free Above</TableHead>
                {canEdit && <TableHead className="w-20 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialOptions.map((option) => (
                <TableRow key={option.id} className="hover:bg-muted/40">
                  <TableCell className="text-xs font-semibold">{option.name}</TableCell>
                  <TableCell className="text-xs">
                    {option.amount === 0
                      ? "Free"
                      : `${currencySymbol}${option.amount.toLocaleString()}`}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {option.freeAboveAmount !== null
                      ? `${currencySymbol}${option.freeAboveAmount.toLocaleString()}`
                      : "—"}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(option)}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(option.id)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
