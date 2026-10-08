import React from "react";
import { notFound } from "next/navigation";
import { getStorefrontI18n } from "@/i18n/server";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";

import { getPublicStoreBySlug, getCustomerAddresses } from "@/modules/storefront/services/storefront-service";
import { getPublicStorePaymentProviders } from "@/modules/payments/services/payment-service";
import { listDeliveryOptions } from "@/modules/shipping/services/shipping-service";
import { getCurrentCustomer } from "@/modules/customer-auth/services/customer-auth-service";
import { CheckoutForm } from "@/components/storefront/checkout/checkout-form";

interface CheckoutPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);
  if (!store) return { title: "Store Not Found" };

  return {
    title: `Checkout | ${store.name}`,
    description: `Complete your order at ${store.name}`,
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;

  const store = await getPublicStoreBySlug(slug);
  if (!store) {
    notFound();
  }

  const { t } = await getStorefrontI18n(store.locale);
  const [paymentProviders, deliveryOptions] = await Promise.all([
    getPublicStorePaymentProviders(store.id),
    listDeliveryOptions(store.id),
  ]);

  // Logged-in storefront customers get the checkout form prefilled with their
  // account details and saved addresses -- guests see the form exactly as
  // before, since both of these are null for them.
  const customer = await getCurrentCustomer(store.id, store.slug);
  const addresses = customer ? await getCustomerAddresses(customer.id) : [];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href={`/store/${store.slug}`} className="hover:text-foreground transition-colors">
          {t("common.home")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{t("checkout.pageTitle")}</span>
      </nav>

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {t("checkout.pageTitle")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {t("checkout.pageSubtitle", { store: store.name })}
        </p>
      </div>

      <CheckoutForm
        store={store}
        paymentProviders={paymentProviders}
        deliveryOptions={deliveryOptions}
        customer={customer ? { name: customer.name, phone: customer.phone, email: customer.email } : null}
        addresses={addresses}
      />
    </div>
  );
}
