"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminDeleteStoreProps {
  storeId: string;
  slug: string;
  ownerEmail: string;
  /** Owner has other stores -- their account can't be deleted with this one. */
  ownerHasOtherStores: boolean;
}

export function AdminDeleteStore({ storeId, slug, ownerEmail, ownerHasOtherStores }: AdminDeleteStoreProps) {
  const router = useRouter();
  const [confirmSlug, setConfirmSlug] = useState("");
  const [deleteOwnerAccount, setDeleteOwnerAccount] = useState(!ownerHasOtherStores);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmSlug, deleteOwnerAccount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      toast.success(deleteOwnerAccount ? "Store and owner account deleted" : "Store deleted");
      router.push("/admin/stores");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
      setBusy(false);
    }
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Delete store permanently</CardTitle>
        <CardDescription>
          For test stores and spam. Removes the store, its products, orders, customers, settings and
          uploaded images. This can&apos;t be undone — to take a real merchant offline, suspend
          instead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={deleteOwnerAccount}
            disabled={ownerHasOtherStores}
            onChange={(e) => setDeleteOwnerAccount(e.target.checked)}
          />
          <span>
            Also delete the owner&apos;s login account (<strong>{ownerEmail}</strong>) — their name,
            email and password. The email can then sign up again from scratch.
            {ownerHasOtherStores && (
              <span className="block text-muted-foreground">
                Not available: this owner has other stores. Delete those first.
              </span>
            )}
          </span>
        </label>
        <div className="space-y-1.5">
          <Label htmlFor="confirmSlug">
            Type <strong>{slug}</strong> to confirm
          </Label>
          <Input
            id="confirmSlug"
            value={confirmSlug}
            onChange={(e) => setConfirmSlug(e.target.value)}
            autoComplete="off"
            className="max-w-xs"
          />
        </div>
        <Button variant="destructive" onClick={remove} disabled={busy || confirmSlug.trim() !== slug}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete store"}
        </Button>
      </CardContent>
    </Card>
  );
}
