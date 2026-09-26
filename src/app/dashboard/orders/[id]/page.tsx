import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  CreditCard,
  PackageCheck,
  Calendar,
} from "lucide-react";

import { getCurrentStore } from "@/lib/tenant";
import { getOrderById } from "@/modules/orders/services/order-service";
import { formatWhatsAppPhone } from "@/modules/storefront/utils/whatsapp";
import { OrderStatusActions } from "@/components/dashboard/orders/order-status-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { store } = await getCurrentStore();
  const { id: orderId } = await params;

  const orderData = await getOrderById(store.id, orderId);
  if (!orderData || !orderData.order) {
    notFound();
  }

  const { order, customer, items } = orderData;
  const dateFormatted = new Date(order.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const customerWhatsapp = customer ? formatWhatsAppPhone(customer.phone) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{order.orderNumber}</h1>
            <Badge
              variant={order.fulfillmentStatus === "DELIVERED" ? "default" : "secondary"}
              className="font-semibold text-xs"
            >
              {order.fulfillmentStatus}
            </Badge>
            <Badge
              variant={order.paymentStatus === "PAID" ? "default" : "outline"}
              className="font-semibold text-xs"
            >
              {order.paymentStatus}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Placed on {dateFormatted} via {order.checkoutChannel}
          </p>
        </div>

        {/* Status Update Form Controls */}
        <OrderStatusActions
          orderId={order.id}
          currentFulfillmentStatus={order.fulfillmentStatus}
          currentPaymentStatus={order.paymentStatus}
        />
      </div>

      {/* Grid Layout (2 Cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Items Table & Pricing Summary (8 Cols) */}
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-primary" />
                Order Items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium text-xs text-foreground">
                          {item.productName}
                        </div>
                        {item.variantName && (
                          <div className="text-[11px] text-muted-foreground">
                            {item.variantName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs">{item.quantity}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {store.currencySymbol}
                        {parseFloat(item.unitPrice).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-xs text-foreground">
                        {store.currencySymbol}
                        {parseFloat(item.lineTotal).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Price Summary */}
              <div className="mt-4 border-t pt-4 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>
                    {store.currencySymbol}
                    {parseFloat(order.subtotal).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>{store.currencySymbol}{parseFloat(order.shippingAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span>-{store.currencySymbol}{parseFloat(order.discountAmount).toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-sm text-foreground">
                  <span>Total Amount</span>
                  <span>
                    {store.currencySymbol}
                    {parseFloat(order.total).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Customer & Delivery Info (4 Cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Customer Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {customer ? (
                <>
                  <div className="font-semibold text-sm text-foreground">
                    {customer.name}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{customer.email}</span>
                    </div>
                  )}

                  {customerWhatsapp && (
                    <div className="pt-2">
                      <a
                        href={`https://wa.me/${customerWhatsapp}?text=${encodeURIComponent(
                          `Hello ${customer.name}, this is ${store.name} regarding your order ${order.orderNumber}!`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#25D366] text-white py-2 text-xs font-semibold hover:bg-[#1EBE5D] transition-colors shadow-2xs"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Message Customer on WhatsApp
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Guest Customer</p>
              )}
            </CardContent>
          </Card>

          {/* Delivery Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Delivery Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {order.deliveryAddressText ? (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <span className="text-foreground leading-relaxed">
                    {order.deliveryAddressText}
                  </span>
                </div>
              ) : (
                <p className="text-muted-foreground">No delivery address specified.</p>
              )}

              {order.customerNotes && (
                <div className="border-t pt-2 mt-2">
                  <span className="font-semibold text-foreground">Delivery Notes:</span>
                  <p className="text-muted-foreground italic mt-0.5">&quot;{order.customerNotes}&quot;</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-primary" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method:</span>
                <span className="font-medium">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-bold">{order.paymentStatus}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
