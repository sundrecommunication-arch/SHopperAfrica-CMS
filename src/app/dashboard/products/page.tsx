import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { getCurrentStore } from "@/lib/tenant";
import { listProducts } from "@/modules/products/services/product-service";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { ProductsTable } from "@/components/dashboard/products/products-table";

export default async function ProductsPage() {
  const { store } = await getCurrentStore();
  const products = await listProducts(store.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <Plus className="size-4" /> Add product
          </Link>
        </Button>
      </div>
      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet."
          description="Add your first product to start selling."
          action={
            <Button asChild>
              <Link href="/dashboard/products/new">Add product</Link>
            </Button>
          }
        />
      ) : (
        <ProductsTable products={products} />
      )}
    </div>
  );
}
