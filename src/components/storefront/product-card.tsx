"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, ShoppingBag } from "lucide-react";

import { useCart } from "./cart/cart-context";
import { Badge } from "@/components/ui/badge";

export interface StorefrontProductItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: string;
  compareAtPrice?: string | null;
  trackInventory: boolean;
  inventoryQuantity: number;
  allowBackorder: boolean;
  lowStockThreshold: number;
  productType?: string | null;
  brand?: string | null;
  primaryImageUrl?: string | null;
}

interface ProductCardProps {
  product: StorefrontProductItem;
  storeSlug: string;
  currencySymbol: string;
}

export function ProductCard({ product, storeSlug, currencySymbol }: ProductCardProps) {
  const { addItem } = useCart();

  const numPrice = parseFloat(product.price);
  const numCompareAt = product.compareAtPrice ? parseFloat(product.compareAtPrice) : null;
  const isSale = numCompareAt !== null && numCompareAt > numPrice;
  const discountPercent = isSale ? Math.round(((numCompareAt - numPrice) / numCompareAt) * 100) : 0;

  const isOutOfStock =
    product.trackInventory && product.inventoryQuantity <= 0 && !product.allowBackorder;
  const isLowStock =
    product.trackInventory &&
    product.inventoryQuantity > 0 &&
    product.inventoryQuantity <= product.lowStockThreshold;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    addItem({
      productId: product.id,
      name: product.name,
      price: numPrice,
      compareAtPrice: numCompareAt,
      imageUrl: product.primaryImageUrl,
      quantity: 1,
      maxQuantity: product.trackInventory && !product.allowBackorder ? product.inventoryQuantity : undefined,
    });
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md">
      {/* Product Image */}
      <Link
        href={`/store/${storeSlug}/products/${product.slug}`}
        className="relative aspect-square w-full overflow-hidden bg-muted/40"
      >
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
            <ShoppingBag className="h-8 w-8 opacity-40" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
          {isSale && (
            <Badge className="bg-destructive text-destructive-foreground text-[11px] font-bold px-2 py-0.5">
              -{discountPercent}%
            </Badge>
          )}
          {isOutOfStock ? (
            <Badge variant="secondary" className="bg-background/90 text-foreground text-[11px] font-semibold">
              Out of Stock
            </Badge>
          ) : isLowStock ? (
            <Badge variant="outline" className="bg-background/90 text-warning border-warning/30 text-[11px] font-medium">
              Only {product.inventoryQuantity} left
            </Badge>
          ) : null}
        </div>

        {/* Quick Add Button on Hover (Desktop) */}
        {!isOutOfStock && (
          <div className="absolute inset-x-2 bottom-2 z-10 hidden sm:block opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
            <button
              type="button"
              onClick={handleQuickAdd}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-background/95 py-2 text-xs font-semibold shadow-md backdrop-blur-xs hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Quick Add
            </button>
          </div>
        )}
      </Link>

      {/* Product Content */}
      <div className="flex flex-1 flex-col p-4">
        {product.brand && (
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {product.brand}
          </span>
        )}

        <Link
          href={`/store/${storeSlug}/products/${product.slug}`}
          className="mt-1 font-medium text-sm text-foreground line-clamp-2 hover:underline underline-offset-2"
        >
          {product.name}
        </Link>

        {/* Price & Mobile Add */}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">
              {currencySymbol}
              {numPrice.toLocaleString()}
            </span>
            {isSale && numCompareAt && (
              <span className="text-xs text-muted-foreground line-through">
                {currencySymbol}
                {numCompareAt.toLocaleString()}
              </span>
            )}
          </div>

          {/* Mobile Quick Add Button */}
          {!isOutOfStock && (
            <button
              type="button"
              onClick={handleQuickAdd}
              className="sm:hidden rounded-full p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add to Cart</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
