"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, MessageSquareQuote } from "lucide-react";

import { useCart } from "./cart-context";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildCartWhatsAppUrl } from "@/modules/storefront/utils/whatsapp";

export function CartDrawer() {
  const t = useT();
  const {
    items,
    isOpen,
    closeCart,
    subtotal,
    itemCount,
    updateQuantity,
    removeItem,
    clearCart,
    storeSlug,
    storeName,
    currencySymbol,
    whatsappNumber,
    whatsappEnabled,
  } = useCart();

  const [customerName, setCustomerName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [showAddressField, setShowAddressField] = useState(false);

  if (!isOpen) return null;

  const handleWhatsAppOrder = () => {
    if (!whatsappNumber) return;
    const url = buildCartWhatsAppUrl({
      whatsappNumber,
      storeName,
      currencySymbol,
      items: items.map((i) => ({
        name: i.name,
        variantName: i.variantName,
        price: i.price,
        quantity: i.quantity,
      })),
      customerName: customerName.trim() || undefined,
      deliveryAddress: deliveryAddress.trim() || undefined,
    });

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="relative z-50 flex h-full w-full max-w-md flex-col bg-card shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t("cart.title")}</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {itemCount}
            </span>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">{t("cart.close")}</span>
          </button>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <p className="text-base font-medium">{t("cart.empty")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("cart.emptyBody")}</p>
            <Button onClick={closeCart} className="mt-6" variant="outline">
              {t("common.continueShopping")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 divide-y">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 pt-4 first:pt-0">
                  {/* Thumbnail */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted border">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        {t("common.noImage")}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="font-medium text-sm line-clamp-1">{item.name}</h3>
                      {item.variantName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.variantName}</p>
                      )}
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-sm font-semibold">
                          {currencySymbol}
                          {item.price.toLocaleString()}
                        </span>
                        {item.compareAtPrice && item.compareAtPrice > item.price && (
                          <span className="text-xs text-muted-foreground line-through">
                            {currencySymbol}
                            {item.compareAtPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center rounded-md border bg-background">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-xs font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
                          disabled={item.maxQuantity ? item.quantity >= item.maxQuantity : false}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t("cart.remove")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Summary & Order Actions */}
            <div className="border-t bg-muted/30 p-6 space-y-4">
              <div className="flex items-center justify-between text-base font-semibold">
                <span>{t("common.subtotal")}</span>
                <span>
                  {currencySymbol}
                  {subtotal.toLocaleString()}
                </span>
              </div>

              {/* Optional details for WhatsApp checkout */}
              {whatsappEnabled && whatsappNumber && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowAddressField((prev) => !prev)}
                    className="text-xs text-primary underline underline-offset-2 hover:opacity-80"
                  >
                    {showAddressField ? t("cart.hideNotes") : t("cart.addNotes")}
                  </button>
                  {showAddressField && (
                    <div className="space-y-2 pt-1">
                      <Input
                        placeholder={t("cart.namePlaceholder")}
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <Input
                        placeholder={t("cart.addressPlaceholder")}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Link href={`/store/${storeSlug}/checkout`} onClick={closeCart} className="block w-full">
                  <Button className="w-full py-5 font-semibold text-base shadow-sm">
                    {t("cart.checkout")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                {whatsappEnabled && whatsappNumber ? (
                  <Button
                    onClick={handleWhatsAppOrder}
                    variant="outline"
                    className="w-full border-[var(--store-primary)]/40 text-[var(--store-primary)] hover:bg-[var(--store-primary)]/10 font-medium py-5 gap-2"
                  >
                    <MessageSquareQuote className="h-5 w-5" />
                    {t("cart.orderViaWhatsapp")}
                  </Button>
                ) : null}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>{t("cart.calculatedAtCheckout")}</span>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-muted-foreground hover:text-destructive underline"
                >
                  {t("cart.clear")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
