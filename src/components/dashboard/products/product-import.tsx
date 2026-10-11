"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileUp, ImagePlus, Loader2 } from "lucide-react";

import {
  mapImportTable,
  parseCsv,
  MAX_IMPORT_ROWS,
  TEMPLATE_CSV,
  type ParsedImport,
} from "@/modules/products/import/csv";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ImportResult {
  products: { id: string; name: string; status: string }[];
  createdCategories: number;
}

function downloadTemplate() {
  const blob = new Blob(["﻿" + TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shopper-products-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ProductImport({
  room,
  maxProducts,
  currencySymbol,
}: {
  /** How many more products the plan allows; null = unlimited. */
  room: number | null;
  maxProducts: number | null;
  currencySymbol: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [publish, setPublish] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(csv|txt|tsv)$/i.test(file.name)) {
      toast.error('Please upload a .csv file. In Excel or Google Sheets, use "Save as / Download → CSV".');
      return;
    }
    setFileName(file.name);
    setParsed(mapImportTable(parseCsv(await file.text())));
  }

  function reset() {
    setParsed(null);
    setFileName(null);
    setResult(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  const rows = parsed?.rows ?? [];
  const overLimit = room !== null && rows.length > room;

  async function runImport() {
    setBusy(true);
    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, publish }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Import failed. No products were imported.");
      setResult(data);
      toast.success(`${data.products.length} products imported`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <Link
        href="/dashboard/products"
        className="-mb-3 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All products
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Import products</h1>
        <p className="text-sm text-muted-foreground">
          Add many products at once from a spreadsheet (Excel, Google Sheets or Numbers).
        </p>
      </div>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-5 text-green-600" />
              {result.products.length} product{result.products.length === 1 ? "" : "s"} imported
            </CardTitle>
            <CardDescription>
              {result.createdCategories > 0 &&
                `${result.createdCategories} new categor${result.createdCategories === 1 ? "y was" : "ies were"} created. `}
              Next, add photos — products with photos sell much better. Name each photo after its product and upload them all at once, or add them one by one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y rounded-lg border">
              {result.products.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    {p.name}
                    {p.status === "DRAFT" && <Badge variant="secondary">Draft</Badge>}
                  </span>
                  <Link
                    href={`/dashboard/products/${p.id}`}
                    target="_blank"
                    className="flex shrink-0 items-center gap-1 text-primary hover:underline"
                  >
                    <ImagePlus className="size-4" /> Add photos
                  </Link>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/dashboard/products/photos">
                  <ImagePlus className="size-4" /> Upload all photos at once
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/products">View all products</Link>
              </Button>
              <Button variant="outline" onClick={reset}>
                Import another file
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Get the template</CardTitle>
              <CardDescription>
                One product per row. Only <strong>name</strong> and <strong>price</strong> are required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="size-4" /> Download template (CSV)
              </Button>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li><strong>price</strong> and <strong>compare_at_price</strong> (old price, shown crossed out): numbers like 15000 — &quot;{currencySymbol}15,000&quot; also works.</li>
                <li><strong>stock</strong>: how many you have (leave blank for 0).</li>
                <li><strong>category</strong>: separate several with a semicolon, e.g. &quot;Beauty; Skincare&quot;. New categories are created for you.</li>
                <li><strong>status</strong>: &quot;active&quot; (visible in your store) or &quot;draft&quot; (hidden). Blank uses the choice below.</li>
                <li>Photos and options (size/colour) are added afterwards on each product&apos;s page.</li>
                <li>When done: Excel → <em>File → Save As → CSV</em>; Google Sheets → <em>File → Download → CSV</em>.</li>
              </ul>
              <p className="text-muted-foreground">
                Up to {MAX_IMPORT_ROWS} products per file.
                {room !== null && ` Your plan allows ${maxProducts} products — you can add ${room} more.`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Upload your file</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onFile(e.dataTransfer.files?.[0]);
                }}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-sm text-muted-foreground hover:bg-muted/40"
              >
                <FileUp className="size-6" />
                {fileName ? (
                  <span>
                    <strong className="text-foreground">{fileName}</strong> — click to choose a different file
                  </span>
                ) : (
                  <span>Click to choose your CSV file, or drag it here</span>
                )}
              </button>

              {parsed?.fatal && (
                <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {parsed.fatal}
                </p>
              )}
            </CardContent>
          </Card>

          {parsed && !parsed.fatal && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">3. Check and import</CardTitle>
                <CardDescription>
                  {rows.length} product{rows.length === 1 ? "" : "s"} ready
                  {parsed.errors.length > 0 && `, ${parsed.errors.length} row(s) with problems will be skipped`}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {parsed.errors.length > 0 && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                    <p className="mb-1 font-medium">These rows will be skipped — fix them in your spreadsheet and upload again to include them:</p>
                    <ul className="list-disc space-y-0.5 pl-5">
                      {parsed.errors.slice(0, 20).map((e) => (
                        <li key={e.line}>
                          Row {e.line} ({e.name}): {e.message}
                        </li>
                      ))}
                      {parsed.errors.length > 20 && <li>…and {parsed.errors.length - 20} more</li>}
                    </ul>
                  </div>
                )}
                {parsed.unknownColumns.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Ignored columns: {parsed.unknownColumns.join(", ")}
                  </p>
                )}

                {rows.length > 0 && (
                  <div className="max-h-96 overflow-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r) => (
                          <TableRow key={r.line}>
                            <TableCell className="text-xs text-muted-foreground">{r.line}</TableCell>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell className="text-right text-sm">
                              {currencySymbol}
                              {r.price.toLocaleString()}
                              {r.compareAtPrice !== null && (
                                <div className="text-xs text-muted-foreground line-through">
                                  {currencySymbol}
                                  {r.compareAtPrice.toLocaleString()}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm">{r.stock}</TableCell>
                            <TableCell className="text-xs">{r.categories.join(", ") || "—"}</TableCell>
                            <TableCell className="text-xs">
                              {(r.status ?? (publish ? "ACTIVE" : "DRAFT")) === "ACTIVE" ? "Active" : "Draft"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={publish}
                    onChange={(e) => setPublish(e.target.checked)}
                  />
                  <span>
                    Make products visible in my store straight away
                    <span className="block text-muted-foreground">
                      Untick to import them as drafts. Rows with a status column keep their own status.
                    </span>
                  </span>
                </label>

                {overLimit && (
                  <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    Your plan lets you add {room} more product{room === 1 ? "" : "s"}, but this file has {rows.length}.
                    Remove some rows, or{" "}
                    <Link href="/dashboard/billing" className="underline">
                      upgrade your plan
                    </Link>
                    .
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={runImport} disabled={busy || rows.length === 0 || overLimit}>
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      `Import ${rows.length} product${rows.length === 1 ? "" : "s"}`
                    )}
                  </Button>
                  <Button variant="ghost" onClick={reset} disabled={busy}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
