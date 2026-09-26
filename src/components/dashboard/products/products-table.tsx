"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MoreHorizontal, Package, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface ProductListItem {
  id: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  price: string;
  inventoryQuantity: number;
  trackInventory: boolean;
  lowStockThreshold: number;
  primaryImageUrl: string | null;
}

const statusVariant = {
  ACTIVE: "success",
  DRAFT: "secondary",
  ARCHIVED: "outline",
} as const;

export function ProductsTable({ products }: { products: ProductListItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not delete product");
        return;
      }
      toast.success(`"${name}" deleted.`);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleStatusChange(id: string, name: string, status: ProductListItem["status"]) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/products/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not update product");
        return;
      }
      toast.success(status === "ACTIVE" ? `"${name}" published.` : `"${name}" moved to draft.`);
      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14" />
          <TableHead>Product</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Inventory</TableHead>
          <TableHead>Price</TableHead>
          <TableHead className="w-9" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell>
              <div className="relative size-10 overflow-hidden rounded-md border bg-muted">
                {product.primaryImageUrl ? (
                  <Image src={product.primaryImageUrl} alt="" fill className="object-cover" sizes="40px" />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Package className="size-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Link href={`/dashboard/products/${product.id}`} className="font-medium hover:underline">
                {product.name}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant[product.status]}>{product.status}</Badge>
            </TableCell>
            <TableCell>
              {!product.trackInventory ? (
                <span className="text-muted-foreground text-sm">Not tracked</span>
              ) : product.inventoryQuantity <= 0 ? (
                <Badge variant="destructive">Out of stock</Badge>
              ) : product.inventoryQuantity <= product.lowStockThreshold ? (
                <Badge variant="warning">Only {product.inventoryQuantity} left</Badge>
              ) : (
                <span className="text-sm">{product.inventoryQuantity} in stock</span>
              )}
            </TableCell>
            <TableCell>${Number(product.price).toFixed(2)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deletingId === product.id || updatingId === product.id}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/products/${product.id}`}>
                      <Pencil className="size-4" /> Edit
                    </Link>
                  </DropdownMenuItem>
                  {product.status === "ACTIVE" ? (
                    <DropdownMenuItem onClick={() => handleStatusChange(product.id, product.name, "DRAFT")}>
                      <EyeOff className="size-4" /> Unpublish
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleStatusChange(product.id, product.name, "ACTIVE")}>
                      <Eye className="size-4" /> Publish
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="destructive" onClick={() => handleDelete(product.id, product.name)}>
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
