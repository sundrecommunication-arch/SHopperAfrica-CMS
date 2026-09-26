import React from "react";
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";

import { getCurrentStore } from "@/lib/tenant";
import { listStoreCustomers } from "@/modules/customers/services/customer-service";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CustomersPage() {
  const { store } = await getCurrentStore();
  const customerList = await listStoreCustomers(store.id);

  if (customerList.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-muted-foreground text-sm">
            Manage your store&apos;s customer database and purchase history.
          </p>
        </div>
        <EmptyState
          icon={Users}
          title="No customers yet."
          description="Customer profiles are created automatically when someone places an order in your store."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-muted-foreground text-sm">
            {customerList.length} {customerList.length === 1 ? "customer" : "customers"} in {store.name}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Orders</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead>Last Order</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customerList.map((customer) => {
              const lastOrderStr = customer.lastOrderDate
                ? new Date(customer.lastOrderDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—";

              return (
                <TableRow key={customer.id} className="hover:bg-muted/40">
                  <TableCell className="font-semibold text-xs text-foreground">
                    <Link
                      href={`/dashboard/customers/${customer.id}`}
                      className="hover:underline text-primary"
                    >
                      {customer.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {customer.phone}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {customer.email || "—"}
                  </TableCell>
                  <TableCell className="text-center text-xs font-medium">
                    {customer.totalOrders}
                  </TableCell>
                  <TableCell className="text-right font-bold text-xs">
                    {store.currencySymbol}
                    {customer.totalSpent.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {lastOrderStr}
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/customers/${customer.id}`}>
                      <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      <span className="sr-only">View customer</span>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
