"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, PackageX } from "lucide-react";

import { ProductCard, type StorefrontProductItem } from "./product-card";
import { useT } from "@/i18n/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductGridProps {
  products: StorefrontProductItem[];
  categories: { id: string; name: string; slug: string; productCount: number }[];
  storeSlug: string;
  currencySymbol: string;
  initialCategorySlug?: string;
  initialSearchQuery?: string;
}

export function ProductGrid({
  products,
  categories,
  storeSlug,
  currencySymbol,
  initialCategorySlug,
  initialSearchQuery = "",
}: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategorySlug ?? null
  );
  const [search, setSearch] = useState(initialSearchQuery);
  const t = useT();
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "name">("newest");

  // Client-side filtering & sorting
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.brand?.toLowerCase().includes(term)
      );
    }

    if (sortBy === "price_asc") {
      result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    } else if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, search, sortBy]);

  return (
    <div className="space-y-6">
      {/* Category Pills & Controls Toolbar */}
      <div className="flex flex-col gap-4">
        {/* Category Pills (Horizontal Scrollable) */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === null
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {t("grid.allItems", { count: products.length })}
            </button>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/store/${storeSlug}/categories/${cat.slug}`}
                className={`rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.slug
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {cat.name} ({cat.productCount})
              </Link>
            ))}
          </div>
        )}

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("grid.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {t.plural("grid.products", filteredProducts.length)}
            </span>
            <Select
              value={sortBy}
              onValueChange={(val) => setSortBy(val as typeof sortBy)}
            >
              <SelectTrigger className="h-9 text-xs w-[150px]">
                <SelectValue placeholder={t("grid.sortBy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("grid.newest")}</SelectItem>
                <SelectItem value="price_asc">{t("grid.priceLowHigh")}</SelectItem>
                <SelectItem value="price_desc">{t("grid.priceHighLow")}</SelectItem>
                <SelectItem value="name">{t("grid.nameAZ")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 px-4 text-center">
          <PackageX className="h-12 w-12 text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-semibold">{t("grid.noProducts")}</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            {search ? t("grid.noMatch", { query: search }) : t("grid.emptyCatalog")}
          </p>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mt-4 text-xs font-semibold text-primary underline"
            >
              {t("grid.clearSearch")}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              storeSlug={storeSlug}
              currencySymbol={currencySymbol}
            />
          ))}
        </div>
      )}
    </div>
  );
}
