import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  CheckCircle2,
  Building2,
  Phone,
  MapPin,
  MessageSquareQuote,
} from "lucide-react";

import { getPublicOrderReceipt } from "@/modules/orders/services/order-service";
import { getPublicStoreBySlug } from "@/modules/storefront/services/storefront-service";
import { getStorefrontI18n } from "@/i18n/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  PaystackPaymentVerifier,
  PaystackRetryButton,
} from "@/components/storefront/checkout/paystack-payment-status";

interface OrderReceiptPageProps {
  params: Promise<{ slug: string; orderNumber: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; orderNumber: string }>;
}): Promise<Metadata> {
  const { slug, orderNumber } = await params;
  const store = await getPublicStoreBySlug(slug);
  const { t } = await getStorefrontI18n(store?.locale);
  return {
    title: t("receipt.metaTitle", { number: orderNumber }),
  };
}

export default async function OrderReceiptPage({ params }: OrderReceiptPageProps) {
  const { slug: storeSlug, orderNumber } = await params;
  const receipt = await getPublicOrderReceipt(storeSlug, orderNumber);

  if (!receipt) {
    notFound();
  }

  const { store, order, customer, items, bankDetails } = receipt;
  const { t } = await getStorefrontI18n(store.locale);
  const subtotalNum = parseFloat(order.subtotal);
  const totalNum = parseFloat(order.total);

  const isBankTransfer =
    order.paymentMethod?.toLowerCase().includes("bank") ||
    order.paymentMethod?.toLowerCase().includes("manual");

  const isPaystackPending =
    (order.paymentMethod === "Paystack Online Payment" ||
      order.paymentMethod === "Online Payment (PayDunya)") &&
    order.paymentStatus === "PENDING";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 sm:px-6 space-y-8">
      <Suspense fallback={null}>
        <PaystackPaymentVerifier
          storeSlug={store.slug}
          orderNumber={order.orderNumber}
          isPending={order.paymentStatus === "PENDING"}
        />
      </Suspense>

      {/* Thank You Hero */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {t("receipt.thanks")}
        </h1>
        <p className="text-sm text-muted-foreground max-w-md">
          {t("receipt.received", { store: store.name })}
        </p>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-muted-foreground">{t("receipt.reference")}</span>
          <span className="font-mono text-sm font-bold bg-muted px-2.5 py-1 rounded-md border">
            {order.orderNumber}
          </span>
        </div>
      </div>

      {/* Main Order Details Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Left Column: Summary & Payment Instructions (7 Cols) */}
        <div className="space-y-6 md:col-span-7">
          {/* Bank Transfer Payment Instructions (Prominent Card) */}
          {isBankTransfer && bankDetails && bankDetails.bankName && (
            <Card className="border-primary/40 bg-primary/5 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-primary font-semibold text-base">
                  <Building2 className="h-5 w-5" />
                  <h3>{t("receipt.bankDetails")}</h3>
                </div>
                <CardDescription>{t("receipt.bankHint")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg bg-background p-4 border space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{t("receipt.bankName")}</span>
                    <span className="font-bold">{bankDetails.bankName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{t("receipt.accountNumber")}</span>
                    <span className="font-mono text-base font-extrabold text-primary">
                      {bankDetails.accountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{t("receipt.accountName")}</span>
                    <span className="font-semibold">{bankDetails.accountName}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-xs text-muted-foreground">{t("receipt.amountToPay")}</span>
                    <span className="font-bold text-base">
                      {store.currencySymbol}
                      {totalNum.toLocaleString()}
                    </span>
                  </div>
                </div>

                {bankDetails.instructions && (
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    <span className="font-semibold text-foreground">{t("receipt.note")}</span> {bankDetails.instructions}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Purchased Items List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{t("receipt.itemsOrdered")}</span>
                <Badge variant="outline" className="text-xs font-normal">
                  {t.plural("receipt.items", items.length)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="divide-y">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 first:pt-0">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{item.productName}</h4>
                      {item.variantName && (
                        <p className="text-xs text-muted-foreground">{item.variantName}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {store.currencySymbol}
                        {parseFloat(item.unitPrice).toLocaleString()} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      {store.currencySymbol}
                      {parseFloat(item.lineTotal).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="border-t pt-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>{t("common.subtotal")}</span>
                  <span>
                    {store.currencySymbol}
                    {subtotalNum.toLocaleString()}
                  </span>
                </div>
                {parseFloat(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-xs">
                    <span>{t("common.discount")}</span>
                    <span>
                      -{store.currencySymbol}
                      {parseFloat(order.discountAmount).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>{t("common.delivery")}{order.deliveryMethod ? ` (${order.deliveryMethod})` : ""}</span>
                  <span>
                    {!order.deliveryMethod
                      ? t("checkout.arrangedWithSeller")
                      : parseFloat(order.shippingAmount) === 0
                      ? t("common.free")
                      : `${store.currencySymbol}${parseFloat(order.shippingAmount).toLocaleString()}`}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between font-extrabold text-base text-foreground">
                  <span>{t("common.total")}</span>
                  <span>
                    {store.currencySymbol}
                    {totalNum.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Order Info & Actions (5 Cols) */}
        <div className="space-y-6 md:col-span-5">
          {/* Create an account (only shown to customers who checked out as a guest) */}
          {!customer.passwordHash && (
            <Card className="border-dashed">
              <CardContent className="space-y-2 py-4">
                <p className="text-sm font-medium">{t("receipt.trackTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("receipt.trackBody")}</p>
                <Link
                  href={`/store/${store.slug}/account?phone=${encodeURIComponent(customer.phone)}`}
                  className="block"
                >
                  <Button variant="outline" size="sm" className="w-full mt-1">
                    {t("receipt.createAccount")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Order Status & Delivery Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("receipt.orderStatus")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("receipt.orderStatus")}</span>
                <Badge className="bg-primary/10 text-primary hover:bg-primary/15 font-semibold">
                  {t.maybe(`status.${order.fulfillmentStatus}`, order.fulfillmentStatus)}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("receipt.paymentStatus")}</span>
                <Badge variant="outline" className="font-semibold">
                  {t.maybe(`status.${order.paymentStatus}`, order.paymentStatus)}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("receipt.paymentMethod")}</span>
                <span className="font-medium text-foreground">
                  {order.paymentMethod ? t.maybe(`paymentMethods.${order.paymentMethod}`, order.paymentMethod) : ""}
                </span>
              </div>

              <div className="border-t pt-3 space-y-2">
                <span className="font-semibold text-foreground">{t("receipt.deliverTo")}</span>
                <p className="font-medium">{customer.name}</p>
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </p>
                {order.deliveryAddressText && (
                  <p className="text-muted-foreground flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{order.deliveryAddressText}</span>
                  </p>
                )}
                {order.customerNotes && (
                  <p className="text-muted-foreground italic pt-1">
                    &quot;{order.customerNotes}&quot;
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp & Navigation Actions */}
          <div className="space-y-3">
            {isPaystackPending && (
              <PaystackRetryButton storeSlug={store.slug} orderNumber={order.orderNumber} />
            )}

            {store.whatsappEnabled && order.whatsappMessage && (
              <a
                href={order.whatsappMessage}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--store-primary)] hover:brightness-90 text-white py-4 text-sm font-semibold transition-all shadow-xs"
              >
                <MessageSquareQuote className="h-5 w-5" />
                <span>{t("receipt.sendOnWhatsapp")}</span>
              </a>
            )}

            <Link href={`/store/${store.slug}`} className="block">
              <Button variant="outline" className="w-full py-5 text-sm font-medium">
                {t("common.continueShopping")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

