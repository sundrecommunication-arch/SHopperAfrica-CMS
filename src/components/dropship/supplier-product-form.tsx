"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

import { ImageUploader, type UploadedImage } from "@/components/dashboard/products/image-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUnsavedChangesGuard } from "@/components/dashboard/use-unsaved-changes-guard";

interface Values {
  name: string;
  description: string;
  images: string[];
  category: string;
  wholesalePrice: number | null;
  suggestedPrice: number | null;
  stock: number;
  sku: string;
  isActive: boolean;
}

const EMPTY: Values = { name: "", description: "", images: [], category: "", wholesalePrice: null, suggestedPrice: null, stock: 0, sku: "", isActive: true };
const CATEGORIES = ["Fashion", "Shoes & Bags", "Beauty & Skincare", "Hair", "Jewellery & Accessories", "Phones & Gadgets", "Home & Kitchen", "Baby & Kids", "Health & Wellness", "Food & Drinks", "Other"];

export function SupplierProductForm({ productId, initial }: { productId?: string; initial?: Values }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(initial ?? EMPTY);
  const [saved, setSaved] = useState(JSON.stringify(initial ?? EMPTY));
  const [busy, setBusy] = useState(false);
  useUnsavedChangesGuard(JSON.stringify(v) !== saved && !busy);

  const images: UploadedImage[] = v.images.map((url, i) => ({ url, isPrimary: i === 0 }));
  const num = (s: string) => (s === "" ? null : Number(s));
  const margin = v.wholesalePrice && v.suggestedPrice ? v.suggestedPrice - v.wholesalePrice : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(productId ? `/api/supplier/products/${productId}` : "/api/supplier/products", {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      setSaved(JSON.stringify(v));
      toast.success(productId ? "Product updated — stores selling it are updated too" : "Product added — stores can now sell it");
      router.push("/supplier/products");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!productId || !confirm("Remove this product? If stores are selling it, it's hidden from them instead.")) return;
    setBusy(true);
    const res = await fetch(`/api/supplier/products/${productId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(data.error ?? "Could not remove");
    toast.success(data.deleted ? "Product removed" : `Hidden from the ${data.stores} store(s) selling it`);
    setSaved(JSON.stringify(v));
    router.push("/supplier/products");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6 pb-12">
      <Link href="/supplier/products" className="-mb-3 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All products
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{productId ? "Edit product" : "Add product"}</h1>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Save product"}
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="name">Product name</Label>
            <Input id="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Photos</Label>
            <ImageUploader
              images={images}
              onChange={(next) => setV({ ...v, images: [...next].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)).map((i) => i.url) })}
              folder="products"
              endpoint="/api/supplier/uploads"
            />
            <p className="text-xs text-muted-foreground">Clear photos on a plain background sell best. The first photo is the main one.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} placeholder="Material, sizes available, colours…" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <select id="category" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Choose…</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sku">Your product code (optional)</Label>
              <Input id="sku" value={v.sku} onChange={(e) => setV({ ...v, sku: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="wholesale">Your price to stores (₦)</Label>
              <Input id="wholesale" type="number" min="1" inputMode="numeric" value={v.wholesalePrice ?? ""} onChange={(e) => setV({ ...v, wholesalePrice: num(e.target.value) })} required />
              <p className="text-xs text-muted-foreground">Including delivery to the customer.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="suggested">Suggested selling price (₦)</Label>
              <Input id="suggested" type="number" min="0" inputMode="numeric" value={v.suggestedPrice ?? ""} onChange={(e) => setV({ ...v, suggestedPrice: num(e.target.value) })} />
              {margin !== null && margin >= 0 && <p className="text-xs text-green-700">Stores earn ₦{margin.toLocaleString()} per sale.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock">How many in stock</Label>
              <Input id="stock" type="number" min="0" inputMode="numeric" value={v.stock} onChange={(e) => setV({ ...v, stock: Number(e.target.value || 0) })} required />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={v.isActive} onChange={(e) => setV({ ...v, isActive: e.target.checked })} />
            Available to stores
          </label>
        </CardContent>
      </Card>

      {productId && (
        <div>
          <Button type="button" variant="ghost" className="text-destructive" onClick={remove} disabled={busy}>
            Remove product
          </Button>
        </div>
      )}
    </form>
  );
}
