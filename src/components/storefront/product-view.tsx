"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Minus, ShoppingBag, MessageSquareQuote, Check, ShieldCheck, Truck } from "lucide-react";

import { useCart } from "./cart/cart-context";
import { ProductGallery } from "./product-gallery";
import { VariantSelector, type VariantItem } from "./variant-selector";
import { ProductCard, type StorefrontProductItem } from "./product-card";
import { FaqSection } from "./faq-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildProductWhatsAppUrl } from "@/modules/storefront/utils/whatsapp";

interface ProductViewProps {
  product: {
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
    brand?: string | null;
    productType?: string | null;
    images: { id: string; url: string; isPrimary: boolean }[];
    variants: VariantItem[];
    categories: { id: string; name: string; slug: string }[];
  };
  relatedProducts: StorefrontProductItem[];
  faqs: { id: string; question: string; answer: string }[];
  store: {
    name: string;
    slug: string;
    whatsappNumber?: string | null;
    whatsappEnabled: boolean;
  };
  currencySymbol: string;
}

export function ProductView({
  product,
  relatedProducts,
  faqs,
  store,
  currencySymbol,
}: ProductViewProps) {
  const { addItem } = useCart();

  const [selectedVariant, setSelectedVariant] = useState<VariantItem | null>(
    product.variants.length > 0 ? product.variants[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [isAddedRecently, setIsAddedRecently] = useState(false);

  // Price calculations based on selected variant or product base price
  const activePrice = selectedVariant?.price
    ? parseFloat(selectedVariant.price)
    : parseFloat(product.price);

  const activeComparePrice = selectedVariant?.compareAtPrice
    ? parseFloat(selectedVariant.compareAtPrice)
    : product.compareAtPrice
    ? parseFloat(product.compareAtPrice)
    : null;

  const isSale = activeComparePrice !== null && activeComparePrice > activePrice;
  const discountPercent = isSale
    ? Math.round(((activeComparePrice - activePrice) / activeComparePrice) * 100)
    : 0;

  // Inventory calculations
  const currentStock = selectedVariant
    ? selectedVariant.inventoryQuantity
    : product.inventoryQuantity;

  const isOutOfStock =
    product.trackInventory && currentStock <= 0 && !product.allowBackorder;
  const isLowStock =
    product.trackInventory &&
    currentStock > 0 &&
    currentStock <= product.lowStockThreshold;

  // Max selectable quantity
  const maxQty =
    product.trackInventory && !product.allowBackorder ? currentStock : 99;

  // Image display (prepend variant image if available)
  const displayImages = React.useMemo(() => {
    if (selectedVariant?.imageUrl) {
      const variantImg = {
        id: `variant_${selectedVariant.id}`,
        url: selectedVariant.imageUrl,
        isPrimary: true,
      };
      return [variantImg, ...product.images.filter((i) => i.url !== selectedVariant.imageUrl)];
    }
    return product.images;
  }, [selectedVariant, product.images]);

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    addItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      variantName: selectedVariant?.name,
      price: activePrice,
      compareAtPrice: activeComparePrice,
      imageUrl: selectedVariant?.imageUrl || product.images[0]?.url || null,
      quantity,
      maxQuantity: product.trackInventory && !product.allowBackorder ? maxQty : undefined,
    });

    setIsAddedRecently(true);
    setTimeout(() => setIsAddedRecently(false), 2000);
  };

  const handleWhatsAppOrder = () => {
    if (!store.whatsappNumber) return;

    const url = buildProductWhatsAppUrl({
      whatsappNumber: store.whatsappNumber,
      storeName: store.name,
      productName: product.name,
      variantName: selectedVariant?.name,
      price: activePrice,
      quantity,
      currencySymbol,
      productUrl: typeof window !== "undefined" ? window.location.href : undefined,
    });

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-16">
      {/* Product Top Section (2 Columns) */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
        {/* Left: Gallery */}
        <div>
          <ProductGallery images={displayImages} productName={product.name} />
        </div>

        {/* Right: Product Details & Buying Actions */}
        <div className="flex flex-col space-y-6">
          {/* Breadcrumbs / Categories */}
          {product.categories.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href={`/store/${store.slug}`} className="hover:underline">
                Home
              </Link>
              <span>/</span>
              <Link
                href={`/store/${store.slug}/categories/${product.categories[0].slug}`}
                className="hover:underline text-foreground font-medium"
              >
                {product.categories[0].name}
              </Link>
            </div>
          )}

          {/* Title & Brand */}
          <div>
            {product.brand && (
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {product.brand}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
              {product.name}
            </h1>
          </div>

          {/* Price & Badges */}
          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold text-foreground">
              {currencySymbol}
              {activePrice.toLocaleString()}
            </span>
            {isSale && activeComparePrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {currencySymbol}
                  {activeComparePrice.toLocaleString()}
                </span>
                <Badge className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5">
                  -{discountPercent}% OFF
                </Badge>
              </>
            )}
          </div>

          {/* Stock Status Indicator */}
          <div>
            {isOutOfStock ? (
              <Badge variant="secondary" className="text-xs font-semibold py-1">
                Out of Stock
              </Badge>
            ) : isLowStock ? (
              <Badge variant="outline" className="text-xs font-medium text-warning border-warning/30 py-1">
                Only {currentStock} left in stock — order soon
              </Badge>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="h-4 w-4" />
                <span>In Stock & Ready to Ship</span>
              </div>
            )}
          </div>

          {/* Variant Selector */}
          {product.variants.length > 0 && (
            <div className="border-t pt-4">
              <VariantSelector
                variants={product.variants}
                selectedVariant={selectedVariant}
                onSelectVariant={(v) => {
                  setSelectedVariant(v);
                  setQuantity(1);
                }}
                currencySymbol={currencySymbol}
                basePrice={product.price}
              />
            </div>
          )}

          {/* Quantity Stepper & Buttons */}
          <div className="border-t pt-6 space-y-4">
            {!isOutOfStock && (
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-foreground">Quantity</span>
                <div className="flex items-center rounded-lg border bg-background">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    disabled={quantity >= maxQty}
                    className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                size="lg"
                className="w-full py-6 text-base font-semibold shadow-sm"
              >
                <ShoppingBag className="mr-2 h-5 w-5" />
                {isAddedRecently
                  ? "Added to Cart! ✓"
                  : isOutOfStock
                  ? "Out of Stock"
                  : "Add to Cart"}
              </Button>

              {store.whatsappEnabled && store.whatsappNumber && (
                <Button
                  onClick={handleWhatsAppOrder}
                  size="lg"
                  className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white py-6 text-base font-semibold shadow-xs"
                >
                  <MessageSquareQuote className="mr-2 h-5 w-5" />
                  Order on WhatsApp
                </Button>
              )}
            </div>
          </div>

          {/* Trust Highlights */}
          <div className="grid grid-cols-2 gap-3 border-t pt-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Verified merchant</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <span>Direct delivery</span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="border-t pt-6 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Product Description</h3>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FAQs */}
      {faqs.length > 0 && (
        <div className="border-t pt-12">
          <FaqSection faqs={faqs} />
        </div>
      )}

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="border-t pt-12 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">You might also like</h2>
            <Link
              href={`/store/${store.slug}`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all products →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                storeSlug={store.slug}
                currencySymbol={currencySymbol}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
