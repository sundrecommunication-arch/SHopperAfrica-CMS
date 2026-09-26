import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, MessageCircle } from "lucide-react";

import { getCurrentStore } from "@/lib/tenant";
import { getCustomerById } from "@/modules/customers/services/customer-service";
import { formatWhatsAppPhone } from "@/modules/storefront/utils/whatsapp";
import { CustomerNotesEditor } from "@/components/dashboard/customers/customer-notes-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { store } = await getCurrentStore();
  const { id: customerId } = await params;

  const data = await getCustomerById(store.id, customerId);
  if (!data || !data.customer) {
    notFound();
  }

  const { customer, orders, addresses, totalSpent, totalOrders } = data;
  const customerWhatsapp = formatWhatsAppPhone(customer.phone);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Customers
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
          <p className="text-xs text-muted-foreground">
            Customer since {new Date(customer.createdAt).toLocaleDateString()}
          </p>
        </div>

        {customerWhatsapp && (
          <a
            href={`https://wa.me/${customerWhatsapp}?text=${encodeURIComponent(
              `Hello ${customer.name}, this is ${store.name}!`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] text-white px-4 py-2 text-xs font-semibold hover:bg-[#1EBE5D] transition-colors shadow-2xs"
          >
            <MessageCircle className="h-4 w-4" />
            Chat on WhatsApp
          </a>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-normal">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {store.currencySymbol}
              {totalSpent.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-normal">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{totalOrders}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-normal">
              Phone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold truncate">{customer.phone}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-normal">
              Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold truncate">{customer.email || "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* 2-Column Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Order History (8 Cols) */}
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Order History ({orders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No orders found for this customer.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="text-primary hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {order.fulfillmentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {order.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-xs">
                          {store.currencySymbol}
                          {parseFloat(order.total).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notes & Addresses (4 Cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Notes Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Merchant Notes</CardTitle>
              <CardDescription>Private notes visible only to store staff.</CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerNotesEditor
                customerId={customer.id}
                initialNotes={customer.notes}
              />
            </CardContent>
          </Card>

          {/* Delivery Addresses Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Delivery Addresses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {addresses.length === 0 ? (
                <p className="text-muted-foreground">No saved addresses.</p>
              ) : (
                addresses.map((addr) => (
                  <div key={addr.id} className="rounded-lg border p-3 bg-muted/20 space-y-1">
                    <p className="font-medium text-foreground">{addr.line1}</p>
                    <p className="text-muted-foreground">
                      {addr.city}{addr.state ? `, ${addr.state}` : ""}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
