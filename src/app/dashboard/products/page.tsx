import Link from "next/link";
import { FileUp, ImagePlus, Package, Plus } from "lucide-react";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Products</h1>
        <div className="flex flex-wrap justify-end gap-2">
          {products.length > 0 && (
            <Button asChild variant="outline">
              <Link href="/dashboard/products/photos">
                <ImagePlus className="size-4" /> Bulk photos
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/dashboard/products/import">
              <FileUp className="size-4" /> Import
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/products/new">
              <Plus className="size-4" /> Add product
            </Link>
          </Button>
        </div>
      </div>
      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet."
          description="Add your first product to start selling, or import many at once from a spreadsheet."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/dashboard/products/new">Add product</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/products/import">Import from spreadsheet</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <ProductsTable products={products} />
      )}
    </div>
  );
}
