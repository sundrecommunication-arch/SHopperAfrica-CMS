"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Globe2, Loader2, Plus, Search } from "lucide-react";

import { estimatePaystackFee } from "@/modules/dropship/fees";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Result {
  pid: string;
  name: string;
  image: string | null;
  fromNaira: number;
  inStoreProductId: string | null;
}

interface Quote {
  name: string;
  image: string | null;
  options: string[];
  wholesaleNaira: number;
  suggestedNaira: number;
  deliveryDays: string;
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString()}`;
const SUGGESTIONS = ["phone case", "wireless earbuds", "handbag", "wig", "sneakers", "smart watch", "kitchen", "baby"];

export function WorldwideCatalog({ canAdd }: { canAdd: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [adding, setAdding] = useState<Result | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [publish, setPublish] = useState(true);
  const [busy, setBusy] = useState(false);

  async function search(term: string, nextPage = 1) {
    if (term.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/dropship/global/search?q=${encodeURIComponent(term)}&page=${nextPage}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(nextPage === 1 ? data.items : [...(results ?? []), ...data.items]);
      setTotal(data.total);
      setPage(nextPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function open(r: Result) {
    setAdding(r);
    setQuote(null);
    setQuoteError(null);
    setPublish(true);
    const res = await fetch(`/api/dropship/global/quote?pid=${encodeURIComponent(r.pid)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setQuoteError(data.error ?? "Couldn't get the delivered price");
    setQuote(data);
    setPrice(String(data.suggestedNaira));
  }

  const priceNum = Number(price || 0);
  const profit = quote ? priceNum - quote.wholesaleNaira - estimatePaystackFee(priceNum) : 0;

  async function add() {
    if (!adding) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dropship/global/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid: adding.pid, price: priceNum, publish }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not add");
      toast.success(`"${quote?.name ?? adding.name}" is ${publish ? "now in your store" : "saved as a draft"}`, {
        action: { label: "View", onClick: () => router.push(`/dashboard/products/${data.product.id}`) },
      });
      setResults((rs) => rs?.map((x) => (x.pid === adding.pid ? { ...x, inStoreProductId: data.product.id } : x)) ?? null);
      setAdding(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Globe2 className="size-4 text-primary" /> Millions of products from CJ Dropshipping&apos;s global warehouses
        </p>
        <p className="mt-1">
          Prices below are in naira and include shipping to your customer in Nigeria. Delivery takes longer than local
          suppliers (usually 10–25 days) — your product page tells customers the delivery time automatically.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products, e.g. wireless earbuds" className="pl-8" />
        </div>
        <Button type="submit" disabled={searching || query.trim().length < 2}>
          {searching && page === 1 ? <Loader2 className="size-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {results === null ? (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuery(s);
                search(s);
              }}
              className="rounded-full border px-3 py-1 text-sm hover:bg-muted"
            >
              {s}
            </button>
          ))}
        </div>
      ) : results.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No products found. Try another word.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {results.map((r) => (
              <Card key={r.pid} className="flex flex-col overflow-hidden p-0">
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- CJ product photo
                  <img src={r.image} alt={r.name} className="aspect-square w-full object-cover" loading="lazy" />
                ) : (
                  <div className="aspect-square w-full bg-muted" />
                )}
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{r.name}</p>
                  <p className="mt-auto pt-2 text-xs">
                    From <span className="font-semibold">{naira(r.fromNaira)}</span> + shipping
                  </p>
                  {r.inStoreProductId ? (
                    <Button asChild size="sm" variant="outline" className="mt-2">
                      <Link href={`/dashboard/products/${r.inStoreProductId}`}>
                        <CheckCircle2 className="size-4 text-green-600" /> In your store
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" className="mt-2" onClick={() => open(r)} disabled={!canAdd} title={canAdd ? undefined : "Add your bank account first"}>
                      <Plus className="size-4" /> Add to my store
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
          {results.length < total && (
            <div className="text-center">
              <Button variant="outline" onClick={() => search(query, page + 1)} disabled={searching}>
                {searching ? <Loader2 className="size-4 animate-spin" /> : "Show more"}
              </Button>
            </div>
          )}
        </>
      )}
      {!canAdd && results && results.length > 0 && <p className="text-sm text-muted-foreground">Add your bank account above to start adding products.</p>}

      <Dialog open={adding !== null} onOpenChange={(o) => !o && !busy && setAdding(null)}>
        <DialogContent>
          {adding && (
            <>
              <DialogHeader>
                <DialogTitle>Add to your store</DialogTitle>
                <DialogDescription className="line-clamp-2">{quote?.name ?? adding.name}</DialogDescription>
              </DialogHeader>
              {quoteError ? (
                <p className="text-sm text-destructive">{quoteError}</p>
              ) : !quote ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Getting the delivered price to Nigeria…
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="wprice">Your selling price (₦)</Label>
                    <Input id="wprice" type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} autoFocus />
                  </div>
                  <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
                    <div className="flex justify-between"><span>Customer pays</span><span>{naira(priceNum)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Product + shipping to Nigeria</span><span>−{naira(quote.wholesaleNaira)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Paystack fee (approx.)</span><span>−{naira(estimatePaystackFee(priceNum))}</span></div>
                    <div className={`flex justify-between border-t pt-1 font-semibold ${profit > 0 ? "text-green-700" : "text-destructive"}`}>
                      <span>You earn per sale</span><span>{naira(profit)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Delivery: about {quote.deliveryDays}.{quote.options.length > 0 && ` Options: ${quote.options.slice(0, 8).join(", ")}${quote.options.length > 8 ? "…" : ""}.`}{" "}
                    Shopper orders it from CJ and ships it to your customer automatically.
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
                    Show it in my store straight away
                  </label>
                </div>
              )}
              <DialogFooter>
                <Button variant="ghost" onClick={() => setAdding(null)} disabled={busy}>Cancel</Button>
                <Button onClick={add} disabled={busy || !quote || profit <= 0}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : "Add to my store"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
