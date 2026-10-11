import Link from "next/link";
import { Plus } from "lucide-react";
import { requireApprovedSupplierPage } from "../supplier-page";
import { listSupplierProducts } from "@/modules/dropship/services/supplier-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function SupplierProductsPage() {
  const supplier = await requireApprovedSupplierPage();
  const rows = await listSupplierProducts(supplier.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">What stores can sell. Your price must include delivery to their customer.</p>
        </div>
        <Button asChild>
          <Link href="/supplier/products/new">
            <Plus className="size-4" /> Add product
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {rows.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No products yet. Add your first one — it takes a minute.</p>
          )}
          {rows.map(({ product: p, stores }) => (
            <Link key={p.id} href={`/supplier/products/${p.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/40">
              {p.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element -- small thumbnail from storage
                <img src={p.images[0]} alt="" className="size-12 shrink-0 rounded object-cover" />
              ) : (
                <div className="size-12 shrink-0 rounded bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  ₦{Number(p.wholesalePrice).toLocaleString()} · {p.stock} in stock · in {stores} store{stores === 1 ? "" : "s"}
                </p>
              </div>
              {!p.isActive ? <Badge variant="secondary">Hidden</Badge> : p.stock === 0 ? <Badge variant="destructive">Out of stock</Badge> : null}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
