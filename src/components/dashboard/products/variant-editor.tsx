"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductVariantInput } from "@/modules/products/validation/schemas";

interface OptionDraft {
  name: string;
  isCustom: boolean;
  values: string[];
}

const CUSTOM = "__custom__";

// Common option names merchants reach for, with example values so the
// "Values" field can hint at the right kind of input for whatever was
// picked — e.g. picking "Size" shows an S/M/L-style placeholder instead of
// a generic one.
const OPTION_PRESETS: { name: string; placeholder: string }[] = [
  { name: "Color", placeholder: "e.g. Black, White, Red" },
  { name: "Size", placeholder: "e.g. S, M, L, XL" },
  { name: "Material", placeholder: "e.g. Cotton, Leather, Denim" },
  { name: "Style", placeholder: "e.g. Slim Fit, Regular Fit" },
  { name: "Pattern", placeholder: "e.g. Plain, Striped, Checked" },
  { name: "Flavor", placeholder: "e.g. Vanilla, Chocolate, Strawberry" },
  { name: "Scent", placeholder: "e.g. Lavender, Citrus, Unscented" },
];

function placeholderFor(name: string) {
  return OPTION_PRESETS.find((p) => p.name === name)?.placeholder ?? "Type a value, press Enter";
}

export function VariantEditor({
  variants,
  onChange,
}: {
  variants: ProductVariantInput[];
  onChange: (variants: ProductVariantInput[]) => void;
}) {
  const [options, setOptions] = useState<OptionDraft[]>(() => deriveOptionsFromVariants(variants));
  const [draftValue, setDraftValue] = useState<Record<number, string>>({});

  function addOption() {
    setOptions((prev) => [...prev, { name: "", isCustom: false, values: [] }]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
    setDraftValue((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  function updateOption(index: number, patch: Partial<OptionDraft>) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function addValues(index: number, raw: string) {
    const pieces = raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (pieces.length === 0) return;
    setOptions((prev) =>
      prev.map((o, i) => (i === index ? { ...o, values: Array.from(new Set([...o.values, ...pieces])) } : o))
    );
  }

  function removeValue(index: number, value: string) {
    setOptions((prev) =>
      prev.map((o, i) => (i === index ? { ...o, values: o.values.filter((v) => v !== value) } : o))
    );
  }

  function handleValuesKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    const current = draftValue[index] ?? "";
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (current.trim()) {
        addValues(index, current);
        setDraftValue((prev) => ({ ...prev, [index]: "" }));
      }
    } else if (e.key === "Backspace" && !current && options[index].values.length > 0) {
      removeValue(index, options[index].values[options[index].values.length - 1]);
    }
  }

  function handleValuesBlur(index: number) {
    const current = draftValue[index] ?? "";
    if (current.trim()) {
      addValues(index, current);
      setDraftValue((prev) => ({ ...prev, [index]: "" }));
    }
  }

  function generateVariants() {
    const cleanOptions = options
      .map((o) => ({ name: o.name.trim(), values: Array.from(new Set(o.values)) }))
      .filter((o) => o.name && o.values.length > 0);

    if (cleanOptions.length === 0) {
      onChange([]);
      return;
    }

    const combos = cleanOptions.reduce<Record<string, string>[]>(
      (acc, option) => acc.flatMap((combo) => option.values.map((value) => ({ ...combo, [option.name]: value }))),
      [{}]
    );

    const existingByName = new Map(variants.map((v) => [v.name, v]));

    const next: ProductVariantInput[] = combos.map((combo) => {
      const name = Object.values(combo).join(" / ");
      return (
        existingByName.get(name) ?? {
          name,
          options: combo,
          sku: "",
          price: null,
          compareAtPrice: null,
          inventoryQuantity: 0,
          imageUrl: "",
        }
      );
    });

    onChange(next);
  }

  function updateVariant(index: number, patch: Partial<ProductVariantInput>) {
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function removeVariant(index: number) {
    onChange(variants.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {options.map((option, index) => (
          <div key={index} className="flex flex-wrap items-start gap-2 rounded-md border p-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Option name</Label>
              <Select
                value={option.isCustom ? CUSTOM : option.name || undefined}
                onValueChange={(value) => {
                  if (value === CUSTOM) {
                    updateOption(index, { isCustom: true, name: "" });
                  } else {
                    updateOption(index, { isCustom: false, name: value });
                  }
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {OPTION_PRESETS.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM}>Custom…</SelectItem>
                </SelectContent>
              </Select>
              {option.isCustom && (
                <Input
                  autoFocus
                  placeholder="Option name"
                  value={option.name}
                  onChange={(e) => updateOption(index, { name: e.target.value })}
                  className="w-40"
                />
              )}
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
              <Label className="text-xs">
                {option.name ? `${option.name} values` : "Values"}
              </Label>
              <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5">
                {option.values.map((value) => (
                  <Badge key={value} variant="secondary" className="gap-1 py-1">
                    {value}
                    <button
                      type="button"
                      onClick={() => removeValue(index, value)}
                      className="hover:text-destructive"
                      aria-label={`Remove ${value}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  value={draftValue[index] ?? ""}
                  onChange={(e) => setDraftValue((prev) => ({ ...prev, [index]: e.target.value }))}
                  onKeyDown={(e) => handleValuesKeyDown(index, e)}
                  onBlur={() => handleValuesBlur(index)}
                  placeholder={option.values.length === 0 ? placeholderFor(option.name) : "Add another…"}
                  className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <Button type="button" variant="ghost" size="icon" className="mt-5" onClick={() => removeOption(index)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            <Plus className="size-4" /> Add option
          </Button>
          {options.length > 0 && (
            <Button type="button" variant="secondary" size="sm" onClick={generateVariants}>
              Generate variants
            </Button>
          )}
        </div>
      </div>

      {variants.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variant</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Inventory</TableHead>
              <TableHead className="w-9" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant, index) => (
              <TableRow key={variant.id ?? variant.name}>
                <TableCell className="font-medium">{variant.name}</TableCell>
                <TableCell>
                  <Input
                    value={variant.sku ?? ""}
                    onChange={(e) => updateVariant(index, { sku: e.target.value })}
                    className="h-8 w-28"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Same as product"
                    value={variant.price ?? ""}
                    onChange={(e) =>
                      updateVariant(index, { price: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    className="h-8 w-32"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={variant.inventoryQuantity}
                    onChange={(e) => updateVariant(index, { inventoryQuantity: Number(e.target.value) })}
                    className="h-8 w-20"
                  />
                </TableCell>
                <TableCell>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(index)}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function deriveOptionsFromVariants(variants: ProductVariantInput[]): OptionDraft[] {
  const map = new Map<string, Set<string>>();
  for (const variant of variants) {
    for (const [key, value] of Object.entries(variant.options ?? {})) {
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(value);
    }
  }
  return Array.from(map.entries()).map(([name, values]) => ({
    name,
    isCustom: !OPTION_PRESETS.some((p) => p.name === name),
    values: Array.from(values),
  }));
}
