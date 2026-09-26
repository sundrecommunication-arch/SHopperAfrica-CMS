"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";

interface ProductGalleryProps {
  images: { id: string; url: string; isPrimary: boolean }[];
  productName: string;
}

// `unoptimized` on both <Image>s below: these already come straight from
// Supabase Storage's CDN, and Next's own image optimizer re-fetching them
// server-side to resize has been seen to intermittently 500/504 (timeout
// talking to Supabase) even though the source file loads fine directly.
// Serving the original URL sidesteps that extra, unreliable hop.
export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="relative aspect-square w-full rounded-2xl border bg-muted/40 flex items-center justify-center text-muted-foreground">
        <ShoppingBag className="h-16 w-16 opacity-30" />
      </div>
    );
  }

  const currentImage = images[selectedIndex] || images[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image View */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border bg-muted/30 shadow-xs">
        <Image
          src={currentImage.url}
          alt={`${productName} view ${selectedIndex + 1}`}
          fill
          className="object-cover transition-all duration-300"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          unoptimized
        />
      </div>

      {/* Thumbnails Row */}
      {images.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
          {images.map((img, index) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`relative h-18 w-18 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                selectedIndex === index
                  ? "border-primary ring-2 ring-primary/20 scale-105"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={img.url}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="72px"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
