"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Landmark, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SavedPayoutAccount {
  bankName: string;
  accountName: string;
  accountNumberLast4: string;
}

/**
 * Bank account for automatic payouts: pick bank, type the 10-digit number,
 * we show the account holder's name from the bank to confirm, then save.
 * Shared by the supplier portal and the merchant's dropshipping page.
 */
export function PayoutAccountForm({
  saveEndpoint,
  existing,
  onSaved,
}: {
  saveEndpoint: string;
  existing: SavedPayoutAccount | null;
  onSaved?: (account: SavedPayoutAccount) => void;
}) {
  const router = useRouter();
  const [account, setAccount] = useState(existing);
  const [editing, setEditing] = useState(!existing);
  const [banks, setBanks] = useState<{ name: string; code: string }[] | null>(null);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing || banks) return;
    fetch("/api/dropship/banks")
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error ?? "Couldn't load banks");
        setBanks(data.banks);
      })
      .catch((e: Error) => setError(e.message));
  }, [editing, banks]);

  // Look the name up as soon as there's a bank and 10 digits.
  useEffect(() => {
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts an async lookup
    setLooking(true);
    setResolvedName(null);
    setError(null);
    fetch("/api/dropship/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankCode, accountNumber }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) throw new Error(data.error ?? "Couldn't find that account");
        setResolvedName(data.accountName);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLooking(false));
    return () => {
      cancelled = true;
    };
  }, [bankCode, accountNumber]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(saveEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankCode, accountNumber }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      setAccount(data.account);
      setEditing(false);
      setAccountNumber("");
      setResolvedName(null);
      toast.success("Bank account saved");
      onSaved?.(data.account);
      router.refresh(); // e.g. unlocks "Add to my store" on the dropshipping page
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (account && !editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
        <div className="flex items-center gap-3">
          <Landmark className="size-5 text-muted-foreground" />
          <div className="text-sm">
            <p className="font-medium">{account.accountName}</p>
            <p className="text-muted-foreground">
              {account.bankName} · ••••{account.accountNumberLast4}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="bank">Bank</Label>
          <select
            id="bank"
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            disabled={!banks}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">{banks ? "Choose your bank" : "Loading banks…"}</option>
            {banks?.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="accountNumber">Account number</Label>
          <Input
            id="accountNumber"
            inputMode="numeric"
            maxLength={10}
            placeholder="10 digits"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      </div>
      {looking && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Checking with your bank…
        </p>
      )}
      {resolvedName && (
        <p className="flex items-center gap-2 rounded-lg bg-green-50 p-2 text-sm text-green-900 dark:bg-green-950/40 dark:text-green-100">
          <CheckCircle2 className="size-4 text-green-600" /> Account name: <strong>{resolvedName}</strong>
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={save} disabled={!resolvedName || saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : resolvedName ? "Yes, pay me here" : "Save bank account"}
        </Button>
        {account && (
          <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
