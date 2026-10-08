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
  Truck,
} from "lucide-react";

import { useCart } from "../cart/cart-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { calculateDeliveryFee, type DeliveryOption } from "@/modules/shipping/utils/delivery-fee";
import { useT } from "@/i18n/client";

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
  deliveryOptions?: DeliveryOption[];
  customer?: CheckoutCustomer | null;
  addresses?: SavedAddress[];
}

export function CheckoutForm({
  store,
  paymentProviders,
  deliveryOptions = [],
  customer = null,
  addresses = [],
}: CheckoutFormProps) {
  const router = useRouter();
  const t = useT();
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

  // Delivery option -- only shown when the merchant has set some up. The
  // fee here is for display; the server recalculates it when placing the order.
  const [deliveryOptionId, setDeliveryOptionId] = useState<string>(
    deliveryOptions.length === 1 ? deliveryOptions[0].id : ""
  );
  const selectedDelivery = deliveryOptions.find((o) => o.id === deliveryOptionId) ?? null;

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculated final total
  const discountAmount = appliedDiscount?.discountAmount ?? 0;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const deliveryFee = selectedDelivery ? calculateDeliveryFee(selectedDelivery, afterDiscount) : 0;
  const finalTotal = afterDiscount + deliveryFee;

  // If cart is empty, show empty state
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold">{t("cart.empty")}</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">{t("checkout.emptyBody")}</p>
        <Link href={`/store/${store.slug}`} className="mt-6">
          <Button>{t("checkout.browseProducts")}</Button>
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
      if (!res.ok) throw new Error(data.error ?? t("checkout.invalidCoupon"));

      setAppliedDiscount(data.discount);
      toast.success(t("checkout.couponAppliedToast", { code: data.discount.code }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("checkout.invalidCoupon"));
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
      toast.error(t("checkout.errName"));
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 7) {
      toast.error(t("checkout.errPhone"));
      return;
    }
    if (!deliveryAddress.trim()) {
      toast.error(t("checkout.errAddress"));
      return;
    }
    if (!city.trim()) {
      toast.error(t("checkout.errCity"));
      return;
    }
    if (deliveryOptions.length > 0 && !selectedDelivery) {
      toast.error(t("checkout.errDelivery"));
      return;
    }
    if (
      (selectedMethod === "PAYSTACK" || selectedMethod === "PAYDUNYA") &&
      !customerEmail.trim()
    ) {
      toast.error(t("checkout.errEmailOnline"));
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
        deliveryOptionId: selectedDelivery?.id,
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
        throw new Error(data.error ?? t("checkout.errPlace"));
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
          toast.error(initData?.error ?? t("checkout.errPaymentStart"));
          clearCart();
          router.push(data.receiptUrl);
          return;
        }

        clearCart();
        window.location.href = initData.authorizationUrl;
        return;
      }

      toast.success(t("checkout.success"));
      clearCart();
      router.push(data.receiptUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("checkout.errPlace"));
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
                {t("checkout.customerInfo")}
              </CardTitle>
              <CardDescription>{t("checkout.customerInfoHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">
                  {t("checkout.fullName")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customerName"
                  placeholder={t("checkout.namePlaceholder")}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">
                    {t("checkout.phone")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    placeholder={t("checkout.phonePlaceholder")}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">
                    {t("checkout.email")}{" "}
                    {selectedMethod === "PAYSTACK" || selectedMethod === "PAYDUNYA" ? (
                      <span className="text-destructive">*</span>
                    ) : (
                      t("checkout.optional")
                    )}
                  </Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    placeholder={t("checkout.emailPlaceholder")}
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required={selectedMethod === "PAYSTACK" || selectedMethod === "PAYDUNYA"}
                  />
                  {(selectedMethod === "PAYSTACK" || selectedMethod === "PAYDUNYA") && (
                    <p className="text-xs text-muted-foreground">
                      {t("checkout.emailRequiredHint")}
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
                {t("checkout.deliveryAddress")}
              </CardTitle>
              <CardDescription>{t("checkout.deliveryAddressHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {addresses.length > 0 && (
                <div className="space-y-2">
                  <Label>{t("checkout.useSavedAddress")}</Label>
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
                      <div className="flex-1 text-sm font-medium">{t("checkout.newAddress")}</div>
                    </label>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="deliveryAddress">
                  {t("checkout.street")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deliveryAddress"
                  placeholder={t("checkout.streetPlaceholder")}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    {t("checkout.city")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="city"
                    placeholder={t("checkout.cityPlaceholder")}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">{t("checkout.state")}</Label>
                  <Input
                    id="state"
                    placeholder={t("checkout.statePlaceholder")}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerNotes">{t("checkout.notes")}</Label>
                <Textarea
                  id="customerNotes"
                  rows={2}
                  placeholder={t("checkout.notesPlaceholder")}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                />
              </div>

              {deliveryOptions.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <Label className="flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-primary" />
                    {t("checkout.deliveryOption")} <span className="text-destructive">*</span>
                  </Label>
                  <div className="space-y-2">
                    {deliveryOptions.map((option) => {
                      const fee = calculateDeliveryFee(option, afterDiscount);
                      return (
                        <label
                          key={option.id}
                          className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                            deliveryOptionId === option.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <input
                            type="radio"
                            name="deliveryOption"
                            value={option.id}
                            checked={deliveryOptionId === option.id}
                            onChange={() => setDeliveryOptionId(option.id)}
                            className="text-primary"
                          />
                          <div className="flex-1 text-sm">
                            <div className="font-medium">{option.name}</div>
                            {option.freeAboveAmount !== null && fee > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {t("checkout.freeAbove", {
                                  amount: `${store.currencySymbol}${option.freeAboveAmount.toLocaleString()}`,
                                })}
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-semibold">
                            {fee === 0 ? t("common.free") : `${store.currencySymbol}${fee.toLocaleString()}`}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {customer && selectedAddressId === "new" && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  <span>{t("checkout.saveAddress")}</span>
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
                {t("checkout.paymentMethod")}
              </CardTitle>
              <CardDescription>{t("checkout.paymentMethodHint")}</CardDescription>
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
                      <span>{t("checkout.paystackTitle")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("checkout.paystackBody")}</p>
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
                      <span>{t("checkout.paydunyaTitle")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("checkout.paydunyaBody")}</p>
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
                    <span>{t("checkout.bankTitle")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("checkout.bankBody")}</p>
                  {selectedMethod === "MANUAL" && manualConfig?.bankName && (
                    <div className="mt-3 rounded-lg bg-background p-3 border text-xs space-y-1">
                      <div className="font-semibold text-foreground">{t("checkout.bankPreview")}</div>
                      <div>{t("checkout.bank")} <span className="font-medium">{manualConfig.bankName}</span></div>
                      <div>{t("checkout.accountNo")} <span className="font-mono font-bold">{manualConfig.accountNumber}</span></div>
                      <div>{t("checkout.accountName")} <span className="font-medium">{manualConfig.accountName}</span></div>
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
                      <span>{t("checkout.codTitle")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("checkout.codBody")}</p>
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
                      <span>{t("checkout.whatsappTitle")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("checkout.whatsappBody")}</p>
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
              <CardTitle className="text-base">{t("checkout.summary")}</CardTitle>
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
                          {t("common.noImage")}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium line-clamp-1">{item.name}</h4>
                      {item.variantName && (
                        <p className="text-[11px] text-muted-foreground">{item.variantName}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{t("checkout.qty", { count: item.quantity })}</p>
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
                        {t("checkout.couponApplied", { code: appliedDiscount.code })}
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
                      placeholder={t("checkout.discountCode")}
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
                        t("checkout.apply")
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("common.subtotal")}</span>
                  <span>
                    {store.currencySymbol}
                    {subtotal.toLocaleString()}
                  </span>
                </div>

                {appliedDiscount && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                    <span>{t("common.discount")} ({appliedDiscount.code})</span>
                    <span>
                      -{store.currencySymbol}
                      {discountAmount.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>{t("common.delivery")}{selectedDelivery ? ` (${selectedDelivery.name})` : ""}</span>
                  <span className={deliveryOptions.length === 0 || !selectedDelivery ? "text-xs" : ""}>
                    {deliveryOptions.length === 0
                      ? t("checkout.arrangedWithSeller")
                      : !selectedDelivery
                      ? t("checkout.chooseOption")
                      : deliveryFee === 0
                      ? t("common.free")
                      : `${store.currencySymbol}${deliveryFee.toLocaleString()}`}
                  </span>
                </div>

                <div className="border-t pt-2 flex justify-between font-bold text-base text-foreground">
                  <span>{t("common.total")}</span>
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
                    {t("checkout.placing")}
                  </>
                ) : (
                  <>
                    {t("checkout.placeOrder", { total: `${store.currencySymbol}${finalTotal.toLocaleString()}` })}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>
                  {customer
                    ? t("checkout.signedInAs", { name: customer.name.split(" ")[0] })
                    : t("checkout.guestCheckout")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
