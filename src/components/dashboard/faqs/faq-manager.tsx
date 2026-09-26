"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FaqRow {
  clientId: string;
  question: string;
  answer: string;
}

const DEFAULT_SCOPE = "default";

function toRows(items: { question: string; answer: string }[]): FaqRow[] {
  return items.map((item) => ({ ...item, clientId: crypto.randomUUID() }));
}

export function FaqManager({
  products,
  initialDefaultFaqs,
}: {
  products: { id: string; name: string }[];
  initialDefaultFaqs: { question: string; answer: string }[];
}) {
  const [scope, setScope] = useState<string>(DEFAULT_SCOPE);
  const [rows, setRows] = useState<FaqRow[]>(() => toRows(initialDefaultFaqs));
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Caches each scope's list once loaded, so switching back and forth
  // doesn't re-fetch or lose unsaved edits to a scope you already opened.
  const [cache, setCache] = useState<Record<string, FaqRow[]>>({
    [DEFAULT_SCOPE]: toRows(initialDefaultFaqs),
  });

  async function handleScopeChange(nextScope: string) {
    setScope(nextScope);

    if (cache[nextScope]) {
      setRows(cache[nextScope]);
      return;
    }

    setIsLoading(true);
    try {
      const productId = nextScope === DEFAULT_SCOPE ? "" : nextScope;
      const res = await fetch(`/api/faqs${productId ? `?productId=${productId}` : ""}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not load FAQs for that product");
        setRows([]);
        return;
      }
      const loaded = toRows(
        (data.items ?? []).map((i: { question: string; answer: string }) => ({
          question: i.question,
          answer: i.answer,
        }))
      );
      setRows(loaded);
      setCache((prev) => ({ ...prev, [nextScope]: loaded }));
    } finally {
      setIsLoading(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    setRows((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateQuestion(clientId: string, question: string) {
    setRows((prev) => prev.map((row) => (row.clientId === clientId ? { ...row, question } : row)));
  }

  function updateAnswer(clientId: string, answer: string) {
    setRows((prev) => prev.map((row) => (row.clientId === clientId ? { ...row, answer } : row)));
  }

  function removeRow(clientId: string) {
    setRows((prev) => prev.filter((row) => row.clientId !== clientId));
  }

  function addRow() {
    setRows((prev) => [...prev, { clientId: crypto.randomUUID(), question: "", answer: "" }]);
  }

  async function handleSave() {
    const trimmed = rows.map((r) => ({ question: r.question.trim(), answer: r.answer.trim() }));
    const emptyIndex = trimmed.findIndex((r) => !r.question || !r.answer);
    if (emptyIndex !== -1) {
      toast.error("Fill in both the question and answer, or remove that row");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/faqs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: scope === DEFAULT_SCOPE ? null : scope,
          items: trimmed,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save these FAQs");
        return;
      }
      toast.success("FAQs saved.");
      const saved = toRows(trimmed);
      setRows(saved);
      setCache((prev) => ({ ...prev, [scope]: saved }));
    } finally {
      setIsSaving(false);
    }
  }

  const selectedProduct = products.find((p) => p.id === scope);
  const scopeLabel =
    scope === DEFAULT_SCOPE ? "Store Default" : selectedProduct?.name ?? "this product";

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-1.5 sm:w-72">
            <Label className="text-xs text-muted-foreground">Manage FAQs for</Label>
            <Select value={scope} onValueChange={handleScopeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_SCOPE}>
                  Store Default (home page + products without their own)
                </SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              {rows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {scope === DEFAULT_SCOPE
                    ? "No default FAQs yet. Add one below — it'll show on your home page and any product without its own list."
                    : `${scopeLabel} has no FAQs of its own yet — it's showing the store default list on its product page. Add one below to give it its own.`}
                </p>
              )}

              {rows.map((row, index) => (
                <div key={row.clientId} className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex shrink-0 flex-col gap-1 pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="size-3.5" />
                        <span className="sr-only">Move up</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        disabled={index === rows.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="size-3.5" />
                        <span className="sr-only">Move down</span>
                      </Button>
                    </div>

                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-muted-foreground">Question</Label>
                        <Input
                          value={row.question}
                          onChange={(e) => updateQuestion(row.clientId, e.target.value)}
                          placeholder="e.g. Do you deliver outside Lagos?"
                          maxLength={200}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-muted-foreground">Answer</Label>
                        <Textarea
                          value={row.answer}
                          onChange={(e) => updateAnswer(row.clientId, e.target.value)}
                          placeholder="Give a clear, direct answer"
                          maxLength={2000}
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 p-0 text-destructive"
                      onClick={() => removeRow(row.clientId)}
                    >
                      <Trash2 className="size-3.5" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" className="w-fit gap-1.5" onClick={addRow}>
                <Plus className="size-4" />
                Add FAQ
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={isSaving || isLoading} onClick={handleSave}>
          {isSaving ? "Saving…" : `Save ${scopeLabel} FAQs`}
        </Button>
      </div>
    </div>
  );
}
