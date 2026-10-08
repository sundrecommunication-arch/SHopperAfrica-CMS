import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStorefrontI18n } from "@/i18n/server";
import type { Metadata } from "next";

import {
  getPublicStoreBySlug,
  getCustomerOrders,
} from "@/modules/storefront/services/storefront-service";
import { getCurrentCustomer } from "@/modules/customer-auth/services/customer-auth-service";
import { AccountAuthForms } from "@/components/storefront/account/account-auth-forms";
import { LogoutButton } from "@/components/storefront/account/logout-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "My Account" };

interface AccountPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ phone?: string }>;
}

export default async function AccountPage({ params, searchParams }: AccountPageProps) {
  const { slug } = await params;
  const { phone } = await searchParams;
  const store = await getPublicStoreBySlug(slug);
  if (!store) notFound();

  const customer = await getCurrentCustomer(store.id, store.slug);
  const { t } = await getStorefrontI18n(store.locale);

  if (!customer) {
    return (
      <div className="container mx-auto max-w-md px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold mb-1">{t("account.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("account.intro", { store: store.name })}</p>
        <AccountAuthForms storeSlug={store.slug} defaultPhone={phone ?? ""} />
      </div>
    );
  }

  const orderHistory = await getCustomerOrders(customer.id);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 sm:px-6 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{t("account.title")}</h1>
          <p className="text-sm text-muted-foreground truncate">
            {t("account.signedInAs", { name: customer.name, phone: customer.phone })}
          </p>
        </div>
        <LogoutButton storeSlug={store.slug} />
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3">{t("account.orderHistory")}</h2>
        {orderHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("account.noOrders")}</p>
        ) : (
          <div className="space-y-3">
            {orderHistory.map((order) => (
              <Link key={order.id} href={`/store/${store.slug}/orders/${order.orderNumber}`}>
                <Card className="hover:bg-muted/40 transition-colors">
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold truncate">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge variant="outline">
                        {t.maybe(`status.${order.fulfillmentStatus}`, order.fulfillmentStatus)}
                      </Badge>
                      <span className="font-semibold text-sm">
                        {store.currencySymbol}
                        {parseFloat(order.total).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
