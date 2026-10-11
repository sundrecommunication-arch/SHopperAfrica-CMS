"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { NIGERIAN_STATES } from "@/modules/dropship/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Values {
  businessName: string;
  phone: string;
  state: string;
  address: string;
  description: string;
  deliveryAreas: string;
  deliveryDays: string;
}

const EMPTY: Values = {
  businessName: "",
  phone: "",
  state: "",
  address: "",
  description: "",
  deliveryAreas: "Nationwide",
  deliveryDays: "2-5 days",
};

export function SupplierApplicationForm({ initial }: { initial: Values | null }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(initial ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/supplier/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not submit");
      toast.success(initial ? "Details saved" : "Application sent!");
      router.push("/supplier");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="businessName">Business name</Label>
            <Input id="businessName" value={v.businessName} onChange={set("businessName")} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">WhatsApp number</Label>
              <Input id="phone" inputMode="tel" placeholder="08012345678" value={v.phone} onChange={set("phone")} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">You ship from</Label>
              <select
                id="state"
                value={v.state}
                onChange={set("state")}
                required
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Choose state</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">What do you sell?</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="e.g. Ladies' handbags and shoes, wholesale from Balogun market. About 200 designs in stock."
              value={v.description}
              onChange={set("description")}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Business address (optional)</Label>
            <Input id="address" value={v.address} onChange={set("address")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deliveryAreas">Where you deliver</Label>
              <Input id="deliveryAreas" placeholder="Nationwide, or e.g. Lagos & Ogun" value={v.deliveryAreas} onChange={set("deliveryAreas")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deliveryDays">Delivery time</Label>
              <Input id="deliveryDays" placeholder="2-5 days" value={v.deliveryDays} onChange={set("deliveryDays")} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Your prices to stores must include delivery to their customer within these areas.
          </p>
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {busy ? <Loader2 className="size-4 animate-spin" /> : initial ? "Save details" : "Send application"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
