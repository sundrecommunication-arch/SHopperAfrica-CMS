"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Search, Truck } from "lucide-react";

import { estimatePaystackFee } from "@/modules/dropship/fees";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CatalogProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  category: string | null;
  wholesalePrice: number;
  suggestedPrice: number | null;
  stock: number;
  supplierName: string;
  supplierState: string;
  deliveryAreas: string;
  deliveryDays: string;
  inStoreProductId: string | null;
  optionSummary: string | null;
}

interface MyProduct {
  id: string;
  name: string;
  price: number;
  wholesalePrice: number;
  stock: number;
  status: string;
  supplierName: string;
  available: boolean;
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString()}`;
/** Default selling price: the supplier's suggestion, else cost + 30% rounded up to the next ₦500. */
const defaultPrice = (p: CatalogProduct) => p.suggestedPrice ?? Math.ceil((p.wholesalePrice * 1.3) / 500) * 500;
const profitAt = (price: number, cost: number) => price - cost - estimatePaystackFee(price);

export function DropshipCatalog({
  products,
  categories,
  search,
  category,
  canAdd,
  mine,
}: {
  products: CatalogProduct[];
  categories: string[];
  search: string;
  category: string;
  canAdd: boolean;
  mine: MyProduct[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState<CatalogProduct | null>(null);
  const [price, setPrice] = useState("");
  const [publish, setPublish] = useState(true);
  const [busy, setBusy] = useState(false);

  function open(p: CatalogProduct) {
    setAdding(p);
    setPrice(String(defaultPrice(p)));
    setPublish(true);
  }

  const priceNum = Number(price || 0);
  const profit = adding ? profitAt(priceNum, adding.wholesalePrice) : 0;
  const minPrice = adding ? adding.wholesalePrice + estimatePaystackFee(adding.wholesalePrice) + 1 : 0;

  async function add() {
    if (!adding) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dropship/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierProductId: adding.id, price: priceNum, publish }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not add");
      toast.success(`"${adding.name}" is ${publish ? "now in your store" : "saved as a draft"}`, {
        action: { label: "View", onClick: () => router.push(`/dashboard/products/${data.product.id}`) },
      });
      setAdding(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {mine.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your dropship products ({mine.length})</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0 text-sm">
            {mine.map((m) => (
              <Link key={m.id} href={`/dashboard/products/${m.id}`} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 hover:bg-muted/40">
                <span className="min-w-0">
                  <span className="font-medium">{m.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    from {m.supplierName} · {m.stock} in stock{m.status !== "ACTIVE" && ` · ${m.status.toLowerCase()}`}
                  </span>
                </span>
                {m.available ? (
                  <span className="text-right text-xs">
                    You sell at {naira(m.price)} · supplier {naira(m.wholesalePrice)}
                    <span className={`block font-semibold ${profitAt(m.price, m.wholesalePrice) > 0 ? "text-green-700" : "text-destructive"}`}>
                      You earn about {naira(profitAt(m.price, m.wholesalePrice))} per sale
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="size-3.5" /> Supplier stopped selling this — remove it from your store
                  </span>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Supplier catalog</h2>
          <form className="flex w-full gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input name="q" defaultValue={search} placeholder="Search products" className="pl-8" />
            </div>
            {categories.length > 0 && (
              <select name="category" defaultValue={category} className="h-9 rounded-md border bg-background px-2 text-sm" onChange={(e) => e.currentTarget.form?.requestSubmit()}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            )}
          </form>
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {search || category ? "No products match. Try another search." : "Suppliers are adding products — check back soon."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => {
              const suggested = defaultPrice(p);
              return (
                <Card key={p.id} className="flex flex-col overflow-hidden p-0">
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- supplier photo from storage
                    <img src={p.images[0]} alt={p.name} className="aspect-square w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="aspect-square w-full bg-muted" />
                  )}
                  <div className="flex flex-1 flex-col gap-1.5 p-3">
                    <p className="line-clamp-2 text-sm font-medium leading-snug">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.supplierName} · {p.supplierState}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Truck className="size-3.5" /> {p.deliveryDays} · {p.deliveryAreas}
                    </p>
                    {p.optionSummary && (
                      <p className="line-clamp-1 text-xs text-muted-foreground" title={p.optionSummary}>
                        Options: {p.optionSummary}
                      </p>
                    )}
                    <div className="mt-auto space-y-0.5 pt-2 text-xs">
                      <p>Supplier price <span className="font-semibold">{naira(p.wholesalePrice)}</span></p>
                      <p>Sell for <span className="font-semibold">{naira(suggested)}</span></p>
                      <p className="font-semibold text-green-700">You earn ~{naira(profitAt(suggested, p.wholesalePrice))}</p>
                    </div>
                    {p.inStoreProductId ? (
                      <Button asChild size="sm" variant="outline" className="mt-2">
                        <Link href={`/dashboard/products/${p.inStoreProductId}`}>
                          <CheckCircle2 className="size-4 text-green-600" /> In your store
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" className="mt-2" onClick={() => open(p)} disabled={!canAdd} title={canAdd ? undefined : "Add your bank account first"}>
                        <Plus className="size-4" /> Add to my store
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        {!canAdd && products.length > 0 && (
          <p className="text-sm text-muted-foreground">Add your bank account above to start adding products.</p>
        )}
      </section>

      <Dialog open={adding !== null} onOpenChange={(o) => !o && !busy && setAdding(null)}>
        <DialogContent>
          {adding && (
            <>
              <DialogHeader>
                <DialogTitle>Add to your store</DialogTitle>
                <DialogDescription>{adding.name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="price">Your selling price (₦)</Label>
                  <Input id="price" type="number" inputMode="numeric" min={minPrice} value={price} onChange={(e) => setPrice(e.target.value)} autoFocus />
                </div>
                <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="flex justify-between"><span>Customer pays</span><span>{naira(priceNum)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Supplier (incl. delivery)</span><span>−{naira(adding.wholesalePrice)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Paystack fee (approx.)</span><span>−{naira(estimatePaystackFee(priceNum))}</span></div>
                  <div className={`flex justify-between border-t pt-1 font-semibold ${profit > 0 ? "text-green-700" : "text-destructive"}`}>
                    <span>You earn per sale</span><span>{naira(profit)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Photos, description and stock are copied in. Stock updates automatically from the supplier. You can edit the
                  name and description later.
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
                  Show it in my store straight away
                </label>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setAdding(null)} disabled={busy}>Cancel</Button>
                <Button onClick={add} disabled={busy || profit <= 0}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : "Add to my store"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
