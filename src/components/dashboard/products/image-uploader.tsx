"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Star, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface UploadedImage {
  id?: string;
  url: string;
  isPrimary: boolean;
}

export function ImageUploader({
  images,
  onChange,
  folder,
  multiple = true,
  label = "Add images",
}: {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  folder: "products" | "categories" | "branding" | "blog";
  multiple?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = multiple ? Array.from(fileList) : [fileList[0]];
    setIsUploading(true);
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);
        const res = await fetch("/api/uploads", { method: "POST", body: formData });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          toast.error(data?.error ?? `Could not upload ${file.name}`);
          continue;
        }
        uploaded.push({ url: data.url, isPrimary: false });
      }
      if (uploaded.length === 0) return;
      const next = multiple ? [...images, ...uploaded] : uploaded;
      if (!next.some((img) => img.isPrimary) && next.length > 0) {
        next[0] = { ...next[0], isPrimary: true };
      }
      onChange(next);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    const next = images.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((img) => img.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange(next);
  }

  function setPrimary(index: number) {
    onChange(images.map((img, i) => ({ ...img, isPrimary: i === index })));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {images.map((img, index) => (
          <div
            key={img.url + index}
            className={cn(
              "group relative size-24 overflow-hidden rounded-lg border",
              img.isPrimary && "ring-2 ring-primary"
            )}
          >
            <Image src={img.url} alt="" fill className="object-cover" sizes="96px" />
            <div className="absolute inset-0 flex flex-col items-center justify-between bg-black/0 p-1 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
              <div className="flex w-full justify-end">
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="rounded-full bg-black/70 p-1 text-white"
                  aria-label="Remove image"
                >
                  <X className="size-3" />
                </button>
              </div>
              {images.length > 1 && (
                <div className="flex w-full items-center justify-between">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    className="rounded-full bg-black/70 p-1 text-white disabled:opacity-30"
                    disabled={index === 0}
                    aria-label="Move earlier"
                  >
                    <ChevronLeft className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrimary(index)}
                    className={cn("rounded-full p-1 text-white", img.isPrimary ? "bg-primary" : "bg-black/70")}
                    aria-label="Set as primary image"
                  >
                    <Star className="size-3" fill={img.isPrimary ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    className="rounded-full bg-black/70 p-1 text-white disabled:opacity-30"
                    disabled={index === images.length - 1}
                    aria-label="Move later"
                  >
                    <ChevronRight className="size-3" />
                  </button>
                </div>
              )}
            </div>
            {img.isPrimary && (
              <span className="absolute top-1 left-1 rounded bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                Primary
              </span>
            )}
          </div>
        ))}

        {(multiple || images.length === 0) && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="flex size-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="size-5" />
                <span className="px-1 text-center text-xs">{label}</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
