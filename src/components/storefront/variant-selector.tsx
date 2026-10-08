"use client";

import React, { useMemo } from "react";
import { useT } from "@/i18n/client";

export interface VariantItem {
  id: string;
  name: string;
  options: Record<string, string>;
  sku?: string | null;
  price?: string | null;
  compareAtPrice?: string | null;
  inventoryQuantity: number;
  imageUrl?: string | null;
}

interface VariantSelectorProps {
  variants: VariantItem[];
  selectedVariant: VariantItem | null;
  onSelectVariant: (variant: VariantItem) => void;
  currencySymbol: string;
  basePrice: string;
}

export function VariantSelector({
  variants,
  selectedVariant,
  onSelectVariant,
  currencySymbol,
  basePrice,
}: VariantSelectorProps) {
  const t = useT();
  // Extract distinct option keys (e.g., "Size", "Color") — computed before
  // any early return so hooks always run in the same order (Rules of Hooks).
  const optionKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const v of variants) {
      if (v.options) {
        Object.keys(v.options).forEach((k) => keys.add(k));
      }
    }
    return Array.from(keys);
  }, [variants]);

  if (variants.length === 0) return null;

  // If options object has structured keys like Size/Color:
  if (optionKeys.length > 0) {
    return (
      <div className="space-y-4">
        {optionKeys.map((key) => {
          // All unique values for this key
          const values = Array.from(
            new Set(variants.map((v) => v.options[key]).filter(Boolean))
          );

          const currentVal = selectedVariant?.options[key];

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">{key}</span>
                {currentVal && <span className="text-muted-foreground">{currentVal}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {values.map((val) => {
                  const isSelected = currentVal === val;

                  // Find variant matching when picking this option
                  const matchingVariant = variants.find((variant) => {
                    if (selectedVariant) {
                      const candidateOptions = { ...selectedVariant.options, [key]: val };
                      return Object.entries(candidateOptions).every(
                        ([k, valChoice]) => variant.options[k] === valChoice
                      );
                    }
                    return variant.options[key] === val;
                  }) ?? variants.find((variant) => variant.options[key] === val);

                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => matchingVariant && onSelectVariant(matchingVariant)}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-medium border transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : "border-border bg-background text-foreground hover:border-muted-foreground/50"
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback if variants are just listed by name (e.g. "Small", "Medium", "Large")
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-foreground">{t("product.options")}</span>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const isSelected = selectedVariant?.id === v.id;
          const displayPrice = v.price ? parseFloat(v.price) : parseFloat(basePrice);

          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelectVariant(v)}
              className={`rounded-lg px-3.5 py-2 text-xs font-medium border text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                  : "border-border bg-background text-foreground hover:border-muted-foreground/50"
              }`}
            >
              <div>{v.name}</div>
              {v.price && (
                <div className="text-[10px] text-muted-foreground">
                  {currencySymbol}{displayPrice.toLocaleString()}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
