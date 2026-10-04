"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Building2, Banknote, CreditCard, Wallet, Save } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface PaymentProviderItem {
  id: string;
  type: "MANUAL" | "CASH_ON_DELIVERY" | "WHATSAPP" | "PAYSTACK" | string;
  label: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
}

interface PaymentMethodsFormProps {
  initialProviders: PaymentProviderItem[];
}

export function PaymentMethodsForm({ initialProviders }: PaymentMethodsFormProps) {
  // Bank Transfer (MANUAL)
  const manualProvider = initialProviders.find((p) => p.type === "MANUAL");
  const [bankEnabled, setBankEnabled] = useState(manualProvider?.isEnabled ?? false);
  const [bankName, setBankName] = useState((manualProvider?.config?.bankName as string) ?? "");
  const [accountNumber, setAccountNumber] = useState(
    (manualProvider?.config?.accountNumber as string) ?? ""
  );
  const [accountName, setAccountName] = useState(
    (manualProvider?.config?.accountName as string) ?? ""
  );
  const [instructions, setInstructions] = useState(
    (manualProvider?.config?.instructions as string) ??
      "Please make payment to the account details above and use your Order Number as payment reference."
  );

  // Paystack (Online Payments)
  const paystackProvider = initialProviders.find((p) => p.type === "PAYSTACK");
  const [paystackEnabled, setPaystackEnabled] = useState(paystackProvider?.isEnabled ?? false);
  const [paystackPublicKey, setPaystackPublicKey] = useState(
    (paystackProvider?.config?.publicKey as string) ?? ""
  );
  const [paystackSecretKey, setPaystackSecretKey] = useState(
    (paystackProvider?.config?.secretKey as string) ?? ""
  );

  // PayDunya (Online Payments -- XOF / West African CFA Franc markets)
  const paydunyaProvider = initialProviders.find((p) => p.type === "PAYDUNYA");
  const [paydunyaEnabled, setPaydunyaEnabled] = useState(paydunyaProvider?.isEnabled ?? false);
  const [paydunyaMasterKey, setPaydunyaMasterKey] = useState(
    (paydunyaProvider?.config?.masterKey as string) ?? ""
  );
  const [paydunyaPrivateKey, setPaydunyaPrivateKey] = useState(
    (paydunyaProvider?.config?.privateKey as string) ?? ""
  );
  const [paydunyaPublicKey, setPaydunyaPublicKey] = useState(
    (paydunyaProvider?.config?.publicKey as string) ?? ""
  );
  const [paydunyaToken, setPaydunyaToken] = useState(
    (paydunyaProvider?.config?.token as string) ?? ""
  );
  const [paydunyaSandbox, setPaydunyaSandbox] = useState(
    (paydunyaProvider?.config?.sandbox as boolean) ?? false
  );

  // Cash on Delivery
  const codProvider = initialProviders.find((p) => p.type === "CASH_ON_DELIVERY");
  const [codEnabled, setCodEnabled] = useState(codProvider?.isEnabled ?? false);
  const [codInstructions, setCodInstructions] = useState(
    (codProvider?.config?.instructions as string) ??
      "Pay with cash or POS upon physical delivery of your order."
  );

  const [isSavingBank, setIsSavingBank] = useState(false);
  const [isSavingPaystack, setIsSavingPaystack] = useState(false);
  const [isSavingPaydunya, setIsSavingPaydunya] = useState(false);
  const [isSavingCod, setIsSavingCod] = useState(false);

  const saveBankTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bankEnabled && (!bankName || !accountNumber || !accountName)) {
      toast.error("Please fill in all bank account details");
      return;
    }

    setIsSavingBank(true);
    try {
      const res = await fetch("/api/payments/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MANUAL",
          label: "Bank Transfer",
          isEnabled: bankEnabled,
          config: {
            bankName,
            accountNumber,
            accountName,
            instructions,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save bank details");

      toast.success("Bank Transfer settings updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error saving bank details");
    } finally {
      setIsSavingBank(false);
    }
  };

  const savePaystack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paystackEnabled && (!paystackPublicKey || !paystackSecretKey)) {
      toast.error("Please provide both Public and Secret keys for Paystack");
      return;
    }

    setIsSavingPaystack(true);
    try {
      const res = await fetch("/api/payments/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PAYSTACK",
          label: "Card / Online Payment (Paystack)",
          isEnabled: paystackEnabled,
          config: {
            publicKey: paystackPublicKey,
            secretKey: paystackSecretKey,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save Paystack settings");

      toast.success("Paystack online payments updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error saving Paystack settings");
    } finally {
      setIsSavingPaystack(false);
    }
  };

  const savePaydunya = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paydunyaEnabled && (!paydunyaMasterKey || !paydunyaPrivateKey || !paydunyaToken)) {
      toast.error("Please provide the Master Key, Private Key, and Token for PayDunya");
      return;
    }

    setIsSavingPaydunya(true);
    try {
      const res = await fetch("/api/payments/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PAYDUNYA",
          label: "Online Payment (PayDunya)",
          isEnabled: paydunyaEnabled,
          config: {
            masterKey: paydunyaMasterKey,
            privateKey: paydunyaPrivateKey,
            publicKey: paydunyaPublicKey,
            token: paydunyaToken,
            sandbox: paydunyaSandbox,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save PayDunya settings");

      toast.success("PayDunya online payments updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error saving PayDunya settings");
    } finally {
      setIsSavingPaydunya(false);
    }
  };

  const saveCod = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCod(true);
    try {
      const res = await fetch("/api/payments/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CASH_ON_DELIVERY",
          label: "Cash on Delivery",
          isEnabled: codEnabled,
          config: {
            instructions: codInstructions,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save Cash on Delivery settings");

      toast.success("Cash on Delivery settings updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error saving settings");
    } finally {
      setIsSavingCod(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bank Transfer Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Bank Transfer (Manual Payment)</CardTitle>
                <CardDescription>
                  Show your bank account details to customers at checkout.
                </CardDescription>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={bankEnabled}
                onChange={(e) => setBankEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveBankTransfer} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  placeholder="e.g. GTBank, Access Bank, Zenith"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  disabled={!bankEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  placeholder="e.g. 0123456789"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  disabled={!bankEnabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                placeholder="e.g. Acme Enterprise Ltd"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                disabled={!bankEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Payment Instructions for Customer</Label>
              <Textarea
                id="instructions"
                rows={3}
                placeholder="Instructions shown to the customer on checkout & order receipt..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                disabled={!bankEnabled}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSavingBank} size="sm">
                <Save className="h-4 w-4 mr-1.5" />
                {isSavingBank ? "Saving..." : "Save Bank Transfer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Paystack Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Paystack (Online Cards & Transfers)</CardTitle>
                <CardDescription>
                  Accept instant card and bank payments directly through Paystack.
                </CardDescription>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={paystackEnabled}
                onChange={(e) => setPaystackEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePaystack} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="paystackPublicKey">Paystack Public Key</Label>
                <Input
                  id="paystackPublicKey"
                  type="text"
                  placeholder="pk_test_... or pk_live_..."
                  value={paystackPublicKey}
                  onChange={(e) => setPaystackPublicKey(e.target.value)}
                  disabled={!paystackEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paystackSecretKey">Paystack Secret Key</Label>
                <Input
                  id="paystackSecretKey"
                  type="password"
                  placeholder="sk_test_... or sk_live_..."
                  value={paystackSecretKey}
                  onChange={(e) => setPaystackSecretKey(e.target.value)}
                  disabled={!paystackEnabled}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSavingPaystack} size="sm">
                <Save className="h-4 w-4 mr-1.5" />
                {isSavingPaystack ? "Saving..." : "Save Paystack"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* PayDunya Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">PayDunya (Online Payments)</CardTitle>
                <CardDescription>
                  Accept online payments via PayDunya -- best for stores serving Benin and other
                  West African CFA Franc (XOF) markets.
                </CardDescription>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={paydunyaEnabled}
                onChange={(e) => setPaydunyaEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePaydunya} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="paydunyaMasterKey">Master Key</Label>
                <Input
                  id="paydunyaMasterKey"
                  type="password"
                  placeholder="Your PayDunya Master Key"
                  value={paydunyaMasterKey}
                  onChange={(e) => setPaydunyaMasterKey(e.target.value)}
                  disabled={!paydunyaEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paydunyaPrivateKey">Private Key</Label>
                <Input
                  id="paydunyaPrivateKey"
                  type="password"
                  placeholder="test_private_... or live_private_..."
                  value={paydunyaPrivateKey}
                  onChange={(e) => setPaydunyaPrivateKey(e.target.value)}
                  disabled={!paydunyaEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paydunyaPublicKey">Public Key</Label>
                <Input
                  id="paydunyaPublicKey"
                  type="text"
                  placeholder="test_public_... or live_public_..."
                  value={paydunyaPublicKey}
                  onChange={(e) => setPaydunyaPublicKey(e.target.value)}
                  disabled={!paydunyaEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paydunyaToken">Token</Label>
                <Input
                  id="paydunyaToken"
                  type="password"
                  placeholder="Your app's PayDunya Token"
                  value={paydunyaToken}
                  onChange={(e) => setPaydunyaToken(e.target.value)}
                  disabled={!paydunyaEnabled}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={paydunyaSandbox}
                onChange={(e) => setPaydunyaSandbox(e.target.checked)}
                disabled={!paydunyaEnabled}
                className="h-4 w-4 rounded border-border text-primary"
              />
              <span>Use sandbox/test mode (no real charges)</span>
            </label>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSavingPaydunya} size="sm">
                <Save className="h-4 w-4 mr-1.5" />
                {isSavingPaydunya ? "Saving..." : "Save PayDunya"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Cash on Delivery Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Cash on Delivery (COD)</CardTitle>
                <CardDescription>
                  Allow customers to pay physically when their package arrives.
                </CardDescription>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={codEnabled}
                onChange={(e) => setCodEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveCod} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codInstructions">COD Instructions / Policy</Label>
              <Textarea
                id="codInstructions"
                rows={2}
                placeholder="Notes for customers choosing Cash on Delivery..."
                value={codInstructions}
                onChange={(e) => setCodInstructions(e.target.value)}
                disabled={!codEnabled}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSavingCod} size="sm">
                <Save className="h-4 w-4 mr-1.5" />
                {isSavingCod ? "Saving..." : "Save Cash on Delivery"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
