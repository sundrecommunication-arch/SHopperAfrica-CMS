import { ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <EmptyState icon={ShoppingBag} title="No orders yet." description="Your orders will appear here when customers buy from your store." />
    </div>
  );
}
