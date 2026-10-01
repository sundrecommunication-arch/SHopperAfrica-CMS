import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
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

  if (!customer) {
    return (
      <div className="container mx-auto max-w-md px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold mb-1">My Account</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sign in or create a free account with {store.name} to track your orders.
        </p>
        <AccountAuthForms storeSlug={store.slug} defaultPhone={phone ?? ""} />
      </div>
    );
  }

  const orderHistory = await getCustomerOrders(customer.id);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 sm:px-6 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">My Account</h1>
          <p className="text-sm text-muted-foreground truncate">
            Signed in as {customer.name} &middot; {customer.phone}
          </p>
        </div>
        <LogoutButton storeSlug={store.slug} />
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3">Order history</h2>
        {orderHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No orders yet. Once you place one, it&apos;ll show up here.
          </p>
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
                      <Badge variant="outline">{order.fulfillmentStatus}</Badge>
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
