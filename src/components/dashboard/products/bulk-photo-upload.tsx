"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";

import { matchPhotoToProduct, type MatchableProduct } from "@/modules/products/import/photo-match";
import { compressImage } from "@/lib/compress-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnsavedChangesGuard } from "../use-unsaved-changes-guard";

const MAX_FILES = 100;
const PARALLEL_UPLOADS = 3;

interface Photo {
  key: string;
  file: File;
  preview: string;
  productId: string; // "" = skip
  autoMatched: boolean;
}

export function BulkPhotoUpload({ products }: { products: (MatchableProduct & { hasPhoto: boolean })[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ added: number; products: number; failed: string[] } | null>(null);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  // Two products can share a name; add the product URL so they can be told apart.
  const labelFor = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.name, (counts.get(p.name) ?? 0) + 1);
    return (p: MatchableProduct) => ((counts.get(p.name) ?? 0) > 1 ? `${p.name} (${p.slug})` : p.name);
  }, [products]);

  // Free the preview thumbnails' memory when photos are removed or the page closes.
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const pending = photos.length > 0 && !result;
  useUnsavedChangesGuard(pending && !busy);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const images = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (images.length < list.length) toast.error("Some files weren't images and were left out.");
    const room = MAX_FILES - photos.length;
    if (images.length > room) toast.error(`Up to ${MAX_FILES} photos at a time — the first ${room} were added.`);
    const added = images.slice(0, Math.max(0, room)).map((file) => {
      const productId = matchPhotoToProduct(file.name, products) ?? "";
      const preview = URL.createObjectURL(file);
      previews.current.push(preview);
      return { key: `${file.name}-${file.size}-${crypto.randomUUID()}`, file, preview, productId, autoMatched: Boolean(productId) };
    });
    setPhotos((prev) => [...prev, ...added]);
    setResult(null);
    if (input.current) input.current.value = "";
  }

  function setProduct(key: string, productId: string) {
    setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, productId, autoMatched: false } : p)));
  }

  function remove(key: string) {
    setPhotos((prev) => prev.filter((p) => p.key !== key));
  }

  const assigned = photos.filter((p) => p.productId);
  const unmatched = photos.length - assigned.length;

  async function upload() {
    setBusy(true);
    setProgress({ done: 0, total: assigned.length });
    const uploaded: { index: number; productId: string; url: string }[] = [];
    const failed: string[] = [];
    const queue = assigned.map((photo, index) => ({ photo, index }));

    async function worker() {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const { photo, index } = next;
        try {
          const file = await compressImage(photo.file);
          const form = new FormData();
          form.append("file", file);
          form.append("folder", "products");
          const res = await fetch("/api/uploads", { method: "POST", body: form });
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error(data?.error ?? "Upload failed");
          uploaded.push({ index, productId: photo.productId, url: data.url });
        } catch (error) {
          failed.push(`${photo.file.name}: ${error instanceof Error ? error.message : "upload failed"}`);
        } finally {
          setProgress((p) => ({ ...p, done: p.done + 1 }));
        }
      }
    }

    try {
      await Promise.all(Array.from({ length: PARALLEL_UPLOADS }, worker));
      if (uploaded.length === 0) throw new Error("None of the photos could be uploaded.");
      // Uploads finish out of order; restore the merchant's order so each
      // product's first photo (its main photo if it has none) is the first chosen.
      uploaded.sort((a, b) => a.index - b.index);
      const res = await fetch("/api/products/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: uploaded.map(({ productId, url }) => ({ productId, url })) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not attach photos to products");
      setResult({ added: data.added, products: data.products, failed });
      setPhotos([]);
      toast.success(`${data.added} photos added`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
      if (failed.length) setResult({ added: 0, products: 0, failed });
    } finally {
      setBusy(false);
    }
  }

  const stillWithout = products.filter((p) => !p.hasPhoto);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <Link
        href="/dashboard/products"
        className="-mb-3 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All products
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Add photos in bulk</h1>
        <p className="text-sm text-muted-foreground">
          Choose many photos at once. Photos named after a product (e.g. <em>Ankara Midi Dress.jpg</em> or{" "}
          <em>ankara-midi-dress-2.jpg</em>) are matched automatically — pick the product for any others.
        </p>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Add some products first, then come back to add their photos.{" "}
            <Link href="/dashboard/products/import" className="text-primary hover:underline">Import products</Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="size-5 text-green-600" />
                  {result.added} photo{result.added === 1 ? "" : "s"} added to {result.products} product
                  {result.products === 1 ? "" : "s"}
                </CardTitle>
                <CardDescription>
                  {stillWithout.length > 0
                    ? `${stillWithout.length} product${stillWithout.length === 1 ? " still has" : "s still have"} no photo.`
                    : "Every product now has a photo."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.failed.length > 0 && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <p className="font-medium">These photos couldn&apos;t be uploaded:</p>
                    <ul className="list-disc pl-5">
                      {result.failed.map((f) => <li key={f}>{f}</li>)}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href="/dashboard/products">View all products</Link>
                  </Button>
                  <Button variant="outline" onClick={() => input.current?.click()}>
                    Add more photos
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          {!result && (
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              disabled={busy}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-sm text-muted-foreground hover:bg-muted/40"
            >
              <ImagePlus className="size-6" />
              {photos.length > 0
                ? "Click to add more photos, or drag them here"
                : `Click to choose photos (up to ${MAX_FILES}), or drag them here`}
            </button>
          )}

          {photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {photos.length} photo{photos.length === 1 ? "" : "s"} · {assigned.length} matched
                  {unmatched > 0 && <span className="text-amber-600"> · {unmatched} need a product</span>}
                </CardTitle>
                <CardDescription>
                  Check each photo is going to the right product. Photos left on &quot;Skip&quot; aren&apos;t uploaded.
                  A product&apos;s first photo becomes its main photo if it doesn&apos;t have one yet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {photos.map((photo) => {
                    const product = productById.get(photo.productId);
                    return (
                      <div
                        key={photo.key}
                        className={`flex gap-3 rounded-lg border p-2 ${photo.productId ? "" : "border-amber-500/60 bg-amber-50/50 dark:bg-amber-950/20"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                        <img src={photo.preview} alt="" className="size-16 shrink-0 rounded object-cover" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-start justify-between gap-1">
                            <p className="truncate text-xs text-muted-foreground" title={photo.file.name}>
                              {photo.file.name}
                            </p>
                            <button
                              type="button"
                              onClick={() => remove(photo.key)}
                              disabled={busy}
                              aria-label={`Remove ${photo.file.name}`}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                          <select
                            value={photo.productId}
                            onChange={(e) => setProduct(photo.key, e.target.value)}
                            disabled={busy}
                            className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                          >
                            <option value="">— Skip (choose product) —</option>
                            {sortedProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {labelFor(p)}
                              </option>
                            ))}
                          </select>
                          {product && (
                            <p className="text-xs text-muted-foreground">
                              {photo.autoMatched && (
                                <span className="text-green-700 dark:text-green-400">Matched by file name. </span>
                              )}
                              {!product.hasPhoto && "Will be its main photo."}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={upload} disabled={busy || assigned.length === 0}>
                    {busy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Uploading {progress.done} of {progress.total}…
                      </>
                    ) : (
                      `Upload ${assigned.length} photo${assigned.length === 1 ? "" : "s"}`
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => setPhotos([])} disabled={busy}>
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {stillWithout.length > 0 && photos.length === 0 && !result && (
            <p className="text-sm text-muted-foreground">
              Products without a photo: {stillWithout.slice(0, 15).map((p) => p.name).join(", ")}
              {stillWithout.length > 15 && ` and ${stillWithout.length - 15} more`}. Tip: name each photo after its
              product before uploading.
            </p>
          )}
        </>
      )}
    </div>
  );
}
