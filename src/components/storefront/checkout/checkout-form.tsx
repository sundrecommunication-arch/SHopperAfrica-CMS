"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Banknote,
  MessageSquareQuote,
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Wallet,
  Tag,
  Loader2,
  X,
} from "lucide-react";

import { useCart } from "../cart/cart-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface PaymentOption {
  id: string;
  type: "MANUAL" | "CASH_ON_DELIVERY" | "WHATSAPP" | "PAYSTACK" | "PAYDUNYA" | string;
  label: string;
  config: Record<string, unknown>;
}

interface SavedAddress {
  id: string;
  label: string | null;
  line1: string;
  city: string;
  state: string | null;
  isDefault: boolean;
}

interface CheckoutCustomer {
  name: string;
  phone: string;
  email: string | null;
}

interface CheckoutFormProps {
  store: {
    id: string;
    name: string;
    slug: string;
    currencySymbol: string;
    whatsappNumber?: string | null;
    whatsappEnabled: boolean;
  };
  paymentProviders: PaymentOption[];
  customer?: CheckoutCustomer | null;
  addresses?: SavedAddress[];
}

export function CheckoutForm({
  store,
  paymentProviders,
  customer = null,
  addresses = [],
}: CheckoutFormProps) {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();

  // Customer State -- prefilled from the logged-in customer's account, if any.
  const [customerName, setCustomerName] = useState(customer?.name ?? "");
  const [customerPhone, setCustomerPhone] = useState(customer?.phone ?? "");
  const [customerEmail, setCustomerEmail] = useState(customer?.email ?? "");

  // Delivery State -- defaults to the customer's default saved address, if any.
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    defaultAddress ? defaultAddress.id : "new"
  );
  const [deliveryAddress, setDeliveryAddress] = useState(defaultAddress?.line1 ?? "");
  const [city, setCity] = useState(defaultAddress?.city ?? "");
  const [state, setState] = useState(defaultAddress?.state ?? "");
  const [customerNotes, setCustomerNotes] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);

  const handleSelectAddress = (id: string) => {
    setSelectedAddressId(id);
    if (id === "new") {
      setDeliveryAddress("");
      setCity("");
      setState("");
      return;
    }
    const addr = addresses.find((a) => a.id === id);
    if (addr) {
      setDeliveryAddress(addr.line1);
      setCity(addr.city);
      setState(addr.state ?? "");
    }
  };

  // Payment Selection
  const defaultMethod =
    paymentProviders.length > 0
      ? (paymentProviders[0].type as "MANUAL" | "CASH_ON_DELIVERY" | "WHATSAPP" | "PAYSTACK" | "PAYDUNYA")
      : "MANUAL";
  const [selectedMethod, setSelectedMethod] = useState<
    "MANUAL" | "CASH_ON_DELIVERY" | "WHATSAPP" | "PAYSTACK" | "PAYDUNYA"
  >(defaultMethod);

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    discountAmount: number;
    type: "PERCENTAGE" | "FIXED";
    value: number;
  } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculated final total
  const discountAmount = appliedDiscount?.discountAmount ?? 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // If cart is empty, show empty state
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold">Your cart is empty</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          Add items to your cart before proceeding to checkout.
        </p>
        <Link href={`/store/${store.slug}`} className="mt-6">
          <Button>Browse Products</Button>
        </Link>
      </div>
    );
  }

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);
    try {
      const res = await fetch("/api/storefront/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeSlug: store.slug,
          code: couponCode.trim(),
          subtotal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invalid discount coupon");

      setAppliedDiscount(data.discount);
      toast.success(`Coupon ${data.discount.code} applied!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid coupon");
      setAppliedDiscount(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedDiscount(null);
    setCouponCode("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 7) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (!deliveryAddress.trim()) {
      toast.error("Please enter your delivery address");
      return;
    }
    if (!city.trim()) {
      toast.error("Please enter your city");
      return;
    }
    if (
      (selectedMethod === "PAYSTACK" || selectedMethod === "PAYDUNYA") &&
      !customerEmail.trim()
    ) {
      toast.error("Please enter your email address to pay online");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        storeSlug: store.slug,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        deliveryAddress: deliveryAddress.trim(),
        city: city.trim(),
        state: state.trim() || undefined,
        customerNotes: customerNotes.trim() || undefined,
        paymentMethodType: selectedMethod,
        checkoutChannel: "WEBSITE",
        discountCode: appliedDiscount?.code || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId || null,
          quantity: i.quantity,
        })),
      };

      const res = await fetch("/api/storefront/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to place order");
      }

      // Best-effort -- a logged-in customer checking "save this address" gets
      // it saved for next time, but a failure here should never block the
      // order they just successfully placed.
      if (customer && saveAddress && selectedAddressId === "new") {
        fetch("/api/storefront/account/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeSlug: store.slug,
            line1: deliveryAddress.trim(),
            city: city.trim(),
            state: state.trim() || undefined,
          }),
        }).catch(() => {});
      }

      // For online payments (Paystack or PayDunya), the order now exists as
      // PENDING — hand off to the provider's hosted checkout before showing
      // the receipt. Every other method (bank transfer, cash on delivery,
      // WhatsApp) has nothing further to do, so it goes straight to the
      // receipt as before.
      if (selectedMethod === "PAYSTACK" || selectedMethod === "PAYDUNYA") {
        const initRes = await fetch("/api/payments/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeSlug: store.slug,
            orderNumber: data.order.orderNumber,
            paymentMethodType: selectedMethod,
          }),
        });
        const initData = await initRes.json().catch(() => null);

        if (!initRes.ok || !initData?.authorizationUrl) {
          toast.error(
            initData?.error ??
              "Your order was placed, but we couldn't start the online payment. You can retry from your order page."
          );
          clearCart();
          router.push(data.receiptUrl);
          return;
        }

        clearCart();
        window.location.href = initData.authorizationUrl;
        return;
      }

      toast.success("Order placed successfully!");
      clearCart();
      router.push(data.receiptUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error placing order");
      setIsSubmitting(false);
    }
  };

  const manualConfig = paymentProviders.find((p) => p.type === "MANUAL")?.config as
    | { bankName?: string; accountNumber?: string; accountName?: string }
    | undefined;

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Checkout Inputs (7 Cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* 1. Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                Customer Information
              </CardTitle>
              <CardDescription>
                We&apos;ll use your phone number to update you on your order status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customerName"
                  placeholder="e.g. Amina Bello"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    placeholder="e.g. 08012345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">
                    Email Address{" "}
                    {selectedMethod === "PAYSTACK" || selectedMethod === "PAYDUNYA" ? (
                      <span className="text-destructive">*</span>
                    ) : (
                      "(optional)"
                    )}
                  </Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    placeholder="e.g. amina@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required={selectedMethod === "PAYSTACK" || selectedMethod === "PAYDUNYA"}
                  />
                  {(selectedMethod === "PAYSTACK" || selectedMethod === "PAYDUNYA") && (
                    <p className="text-xs text-muted-foreground">
                      Required for online payment — your receipt goes here too.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Delivery Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </span>
                Delivery Address
              </CardTitle>
              <CardDescription>Where should we deliver your order?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {addresses.length > 0 && (
                <div className="space-y-2">
                  <Label>Use a saved address</Label>
                  <div className="space-y-2">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                          selectedAddressId === addr.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="savedAddress"
                          value={addr.id}
                          checked={selectedAddressId === addr.id}
                          onChange={() => handleSelectAddress(addr.id)}
                          className="mt-1 text-primary"
                        />
                        <div className="flex-1 text-sm">
                          {addr.label && <div className="font-semibold">{addr.label}</div>}
                          <div className="text-muted-foreground">
                            {addr.line1}, {addr.city}
                            {addr.state ? `, ${addr.state}` : ""}
                          </div>
                        </div>
                      </label>
                    ))}
                    <label
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                        selectedAddressId === "new"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        value="new"
                        checked={selectedAddressId === "new"}
                        onChange={() => handleSelectAddress("new")}
                        className="mt-1 text-primary"
                      />
                      <div className="flex-1 text-sm font-medium">Enter a new address</div>
                    </label>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="deliveryAddress">
                  Street Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deliveryAddress"
                  placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    City / Town <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="city"
                    placeholder="e.g. Lagos"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State / Region</Label>
                  <Input
                    id="state"
                    placeholder="e.g. Lagos State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerNotes">Delivery Notes (optional)</Label>
                <Textarea
                  id="customerNotes"
                  rows={2}
                  placeholder="e.g. Leave package with security guard..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                />
              </div>

              {customer && selectedAddressId === "new" && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  <span>Save this address for next time</span>
                </label>
              )}
            </CardContent>
          </Card>

          {/* 3. Payment Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  3
                </span>
                Payment Method
              </CardTitle>
              <CardDescription>Choose how you want to pay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Paystack Online Payment */}
              {paymentProviders.some((p) => p.type === "PAYSTACK") && (
                <label
                  className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                    selectedMethod === "PAYSTACK"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="PAYSTACK"
                    checked={selectedMethod === "PAYSTACK"}
                    onChange={() => setSelectedMethod("PAYSTACK")}
                    className="mt-1 text-primary"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <span>Card / Online Payment (Paystack)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pay instantly with Debit Card, Bank Transfer, USSD, or Apple Pay.
                    </p>
                  </div>
                </label>
              )}

              {/* PayDunya Online Payment */}
              {paymentProviders.some((p) => p.type === "PAYDUNYA") && (
                <label
                  className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                    selectedMethod === "PAYDUNYA"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="PAYDUNYA"
                    checked={selectedMethod === "PAYDUNYA"}
                    onChange={() => setSelectedMethod("PAYDUNYA")}
                    className="mt-1 text-primary"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <Wallet className="h-4 w-4 text-amber-600" />
                      <span>Online Payment (PayDunya)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pay instantly with Mobile Money, Card, or Bank Transfer via PayDunya.
                    </p>
                  </div>
                </label>
              )}

              {/* Bank Transfer Option */}
              <label
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                  selectedMethod === "MANUAL"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="MANUAL"
                  checked={selectedMethod === "MANUAL"}
                  onChange={() => setSelectedMethod("MANUAL")}
                  className="mt-1 text-primary"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>Direct Bank Transfer</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Transfer directly to the merchant&apos;s bank account. Bank details will be
                    provided immediately upon placing the order.
                  </p>
                  {selectedMethod === "MANUAL" && manualConfig?.bankName && (
                    <div className="mt-3 rounded-lg bg-background p-3 border text-xs space-y-1">
                      <div className="font-semibold text-foreground">Bank Details Preview:</div>
                      <div>Bank: <span className="font-medium">{manualConfig.bankName}</span></div>
                      <div>Account No: <span className="font-mono font-bold">{manualConfig.accountNumber}</span></div>
                      <div>Account Name: <span className="font-medium">{manualConfig.accountName}</span></div>
                    </div>
                  )}
                </div>
              </label>

              {/* Cash on Delivery Option (if enabled) */}
              {paymentProviders.some((p) => p.type === "CASH_ON_DELIVERY") && (
                <label
                  className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                    selectedMethod === "CASH_ON_DELIVERY"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CASH_ON_DELIVERY"
                    checked={selectedMethod === "CASH_ON_DELIVERY"}
                    onChange={() => setSelectedMethod("CASH_ON_DELIVERY")}
                    className="mt-1 text-primary"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <Banknote className="h-4 w-4 text-emerald-600" />
                      <span>Cash on Delivery</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pay with cash or POS when your items are delivered to your doorstep.
                    </p>
                  </div>
                </label>
              )}

              {/* WhatsApp Checkout Option */}
              {store.whatsappEnabled && store.whatsappNumber && (
                <label
                  className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                    selectedMethod === "WHATSAPP"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="WHATSAPP"
                    checked={selectedMethod === "WHATSAPP"}
                    onChange={() => setSelectedMethod("WHATSAPP")}
                    className="mt-1 text-primary"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <MessageSquareQuote className="h-4 w-4 text-[var(--store-primary)]" />
                      <span>Order on WhatsApp</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Place the order and open WhatsApp directly with your pre-filled receipt to
                      finalize with the merchant.
                    </p>
                  </div>
                </label>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Order Summary & Coupon (5 Cols) */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Item List */}
              <div className="space-y-3 divide-y max-h-64 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 pt-3 first:pt-0">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium line-clamp-1">{item.name}</h4>
                      {item.variantName && (
                        <p className="text-[11px] text-muted-foreground">{item.variantName}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-xs font-semibold">
                      {store.currencySymbol}
                      {(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Code Section */}
              <div className="border-t pt-4">
                {appliedDiscount ? (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-4 w-4" />
                      <span>
                        Coupon <span className="font-mono font-bold">{appliedDiscount.code}</span> applied
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="p-1 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Discount code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="h-9 text-xs uppercase font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={isValidatingCoupon || !couponCode.trim()}
                      className="h-9 text-xs"
                    >
                      {isValidatingCoupon ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>
                    {store.currencySymbol}
                    {subtotal.toLocaleString()}
                  </span>
                </div>

                {appliedDiscount && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                    <span>Discount ({appliedDiscount.code})</span>
                    <span>
                      -{store.currencySymbol}
                      {discountAmount.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery</span>
                  <span className="text-xs">Free / Standard</span>
                </div>

                <div className="border-t pt-2 flex justify-between font-bold text-base text-foreground">
                  <span>Total</span>
                  <span>
                    {store.currencySymbol}
                    {finalTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                className="w-full py-6 text-base font-semibold shadow-sm mt-4"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    Place Order ({store.currencySymbol}{finalTotal.toLocaleString()})
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>
                  {customer
                    ? `Signed in as ${customer.name.split(" ")[0]} • Secure checkout`
                    : "Secure guest checkout • No login required"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
