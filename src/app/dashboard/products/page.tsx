import { Package } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Products</h1>
      <EmptyState icon={Package} title="No products yet." description="Add your first product to start selling." />
    </div>
  );
}
