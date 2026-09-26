"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_NAV_ITEMS } from "@/modules/nav/constants";
import type { NavItemKind } from "@/modules/nav/validation/schemas";

interface NavRow {
  clientId: string;
  kind: NavItemKind;
  label: string;
  url: string | null;
  isVisible: boolean;
}

type LinkTarget = "PRODUCT" | "CATEGORY" | "EXTERNAL";

function toRows(items: { kind: NavItemKind; label: string; url: string | null; isVisible: boolean }[]): NavRow[] {
  return items.map((item) => ({ ...item, clientId: crypto.randomUUID() }));
}

export function NavItemsManager({
  initialItems,
  storeSlug,
  products,
  categories,
}: {
  initialItems: { kind: NavItemKind; label: string; url: string | null; isVisible: boolean }[];
  storeSlug: string;
  products: { id: string; name: string; slug: string }[];
  categories: { id: string; name: string; slug: string }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<NavRow[]>(() => toRows(initialItems));
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [linkTarget, setLinkTarget] = useState<LinkTarget>(
    products.length > 0 ? "PRODUCT" : categories.length > 0 ? "CATEGORY" : "EXTERNAL"
  );
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );

  function move(index: number, direction: -1 | 1) {
    setRows((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function toggleVisible(clientId: string) {
    setRows((prev) =>
      prev.map((row) => (row.clientId === clientId ? { ...row, isVisible: !row.isVisible } : row))
    );
  }

  function updateLabel(clientId: string, label: string) {
    setRows((prev) => prev.map((row) => (row.clientId === clientId ? { ...row, label } : row)));
  }

  function updateUrl(clientId: string, url: string) {
    setRows((prev) => prev.map((row) => (row.clientId === clientId ? { ...row, url } : row)));
  }

  function removeRow(clientId: string) {
    setRows((prev) => prev.filter((row) => row.clientId !== clientId));
  }

  function resetAddForm() {
    setNewLabel("");
    setNewUrl("");
    setSelectedProductId("");
    setSelectedCategoryId("");
    setIsAdding(false);
  }

  function addCustomLink() {
    let label = newLabel.trim();
    let url: string | null = null;

    if (linkTarget === "PRODUCT") {
      if (!selectedProduct) {
        toast.error("Choose a product to link to");
        return;
      }
      url = `/store/${storeSlug}/products/${selectedProduct.slug}`;
      if (!label) label = selectedProduct.name;
    } else if (linkTarget === "CATEGORY") {
      if (!selectedCategory) {
        toast.error("Choose a category to link to");
        return;
      }
      url = `/store/${storeSlug}/categories/${selectedCategory.slug}`;
      if (!label) label = selectedCategory.name;
    } else {
      if (!newUrl.trim()) {
        toast.error("Enter a page path or URL to link to");
        return;
      }
      url = newUrl.trim();
    }

    if (!label) {
      toast.error("Give the link a name");
      return;
    }

    setRows((prev) => [
      ...prev,
      { clientId: crypto.randomUUID(), kind: "CUSTOM", label, url, isVisible: true },
    ]);
    resetAddForm();
  }

  function restoreDefaults() {
    setRows(toRows(DEFAULT_NAV_ITEMS));
    toast.message("Default menu restored — click Save to apply it.");
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/stores/nav", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: rows.map(({ kind, label, url, isVisible }) => ({ kind, label, url, isVisible })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save your menu");
        return;
      }
      toast.success("Menu saved.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  const visibleCount = rows.filter((r) => r.isVisible).length;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          {rows.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Your menu is empty. Add a link below, or restore the default menu.
            </p>
          )}
          {visibleCount === 0 && rows.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              Every item is hidden — your storefront menu will show nothing until you turn at
              least one back on.
            </div>
          )}
          {rows.map((row, index) => (
            <div
              key={row.clientId}
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
            >
              <div className="flex shrink-0 items-center gap-1">
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

              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1.5 sm:w-48">
                  <Label className="text-xs text-muted-foreground">Menu label</Label>
                  <Input
                    value={row.label}
                    onChange={(e) => updateLabel(row.clientId, e.target.value)}
                    maxLength={50}
                  />
                </div>
                {row.kind === "CUSTOM" ? (
                  <div className="flex flex-col gap-1.5 sm:flex-1">
                    <Label className="text-xs text-muted-foreground">Link</Label>
                    <Input
                      value={row.url ?? ""}
                      onChange={(e) => updateUrl(row.clientId, e.target.value)}
                      placeholder="/store/your-slug/products/... or https://..."
                    />
                  </div>
                ) : (
                  <Badge variant="outline" className="w-fit sm:mt-5">
                    {row.kind === "PRODUCTS" ? "Built-in — links to your catalog" : "Built-in page"}
                  </Badge>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:mt-5">
                <button
                  type="button"
                  onClick={() => toggleVisible(row.clientId)}
                  className="cursor-pointer"
                >
                  <Badge variant={row.isVisible ? "success" : "secondary"}>
                    {row.isVisible ? "Visible" : "Hidden"}
                  </Badge>
                </button>
                {row.kind === "CUSTOM" && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive"
                    onClick={() => removeRow(row.clientId)}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Remove</span>
                  </Button>
                )}
              </div>
            </div>
          ))}

          {isAdding ? (
            <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
              <div className="flex flex-col gap-1.5 sm:w-56">
                <Label className="text-xs text-muted-foreground">Link to</Label>
                <Select value={linkTarget} onValueChange={(v) => setLinkTarget(v as LinkTarget)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRODUCT" disabled={products.length === 0}>
                      A product
                    </SelectItem>
                    <SelectItem value="CATEGORY" disabled={categories.length === 0}>
                      A category
                    </SelectItem>
                    <SelectItem value="EXTERNAL">Another page or external URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {linkTarget === "PRODUCT" && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Product</Label>
                  {products.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      You don&apos;t have any active products yet.
                    </p>
                  ) : (
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {linkTarget === "CATEGORY" && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  {categories.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      You don&apos;t have any categories yet.
                    </p>
                  ) : (
                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {linkTarget === "EXTERNAL" && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Page path or URL</Label>
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder={`/store/${storeSlug}/... or https://...`}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5 sm:w-56">
                <Label className="text-xs text-muted-foreground">
                  Menu label {linkTarget !== "EXTERNAL" && "(optional — defaults to the name)"}
                </Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder={
                    linkTarget === "PRODUCT"
                      ? selectedProduct?.name ?? "e.g. Featured Item"
                      : linkTarget === "CATEGORY"
                      ? selectedCategory?.name ?? "e.g. New Arrivals"
                      : "e.g. Lookbook"
                  }
                  maxLength={50}
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" onClick={addCustomLink}>
                  Add to menu
                </Button>
                <Button type="button" variant="ghost" onClick={resetAddForm}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-fit gap-1.5"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="size-4" />
              Add a link
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={isSaving} onClick={handleSave}>
          {isSaving ? "Saving…" : "Save menu"}
        </Button>
        <Button type="button" variant="ghost" onClick={restoreDefaults}>
          Restore default menu
        </Button>
      </div>
    </div>
  );
}
