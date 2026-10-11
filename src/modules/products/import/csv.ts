import { z } from "zod";

// Bulk product import from a spreadsheet saved as CSV (Excel, Google Sheets,
// Numbers). Pure functions, used in the browser for the preview and on the
// server (via importRowSchema) to re-check every row before saving.

export const MAX_IMPORT_ROWS = 500;

export const TEMPLATE_HEADERS = [
  "name",
  "price",
  "description",
  "compare_at_price",
  "stock",
  "sku",
  "category",
  "status",
] as const;

export const TEMPLATE_CSV =
  TEMPLATE_HEADERS.join(",") +
  "\n" +
  [
    ['Ankara Midi Dress', "15000", "Hand-made ankara dress, sizes S-XL", "18000", "10", "DRS-001", "Dresses", "active"],
    ['Shea Butter 250g', "3500", "Pure unrefined shea butter", "", "40", "", "Beauty; Skincare", "active"],
    ['Leather Sandals', "12000", "", "", "5", "", "Shoes", "draft"],
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n") +
  "\n";

function csvCell(value: string) {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** RFC 4180-ish parser: quoted fields, "" escapes, newlines inside quotes, BOM, auto-detected , ; or tab. */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, "");
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].reduce((best, d) =>
    firstLine.split(d).length > firstLine.split(best).length ? d : best
  );

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// Header names people actually use, mapped to our fields.
const HEADER_ALIASES: Record<string, keyof RawImportRow> = {
  name: "name", "product name": "name", product: "name", title: "name", "product title": "name",
  price: "price", "selling price": "price", amount: "price",
  description: "description", details: "description",
  compare_at_price: "compareAtPrice", "compare at price": "compareAtPrice", "old price": "compareAtPrice",
  "original price": "compareAtPrice", "was price": "compareAtPrice",
  stock: "stock", quantity: "stock", qty: "stock", inventory: "stock", "stock quantity": "stock",
  sku: "sku", code: "sku", "product code": "sku",
  category: "category", categories: "category", collection: "category",
  status: "status", visibility: "status",
  brand: "brand",
  tags: "tags",
};

interface RawImportRow {
  name: string;
  price: string;
  description: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
  category: string;
  status: string;
  brand: string;
  tags: string;
}

/** What the browser sends to /api/products/import, one per spreadsheet row. */
export const importRowSchema = z.object({
  line: z.number().int(),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(200, "Name is too long (max 200 characters)"),
  price: z.number({ message: "Price must be a number" }).min(0, "Price can't be negative"),
  description: z.string().max(5000, "Description is too long (max 5000 characters)").default(""),
  compareAtPrice: z.number().min(0).nullable().default(null),
  stock: z.number().int("Stock must be a whole number").min(0, "Stock can't be negative").default(0),
  sku: z.string().max(100).default(""),
  categories: z.array(z.string().trim().min(1).max(100)).max(10).default([]),
  status: z.enum(["ACTIVE", "DRAFT"]).nullable().default(null), // null = use the "publish" choice
  brand: z.string().max(100).default(""),
  tags: z.array(z.string().max(50)).max(30).default([]),
});
export type ImportRow = z.infer<typeof importRowSchema>;

export interface ParsedImport {
  rows: ImportRow[];
  /** Rows that can't be imported, with the reason, by spreadsheet line number. */
  errors: { line: number; name: string; message: string }[];
  /** Header problems that stop the whole file (e.g. no "name" column). */
  fatal: string | null;
  unknownColumns: string[];
}

/** "₦15,000", "15 000.50", "N15000" -> number; "" -> null; junk -> NaN. */
function parseMoney(value: string): number | null {
  const cleaned = value
    .replace(/[\s,]/g, "")
    .replace(/^(₦|\$|€|£|NGN|GHS|KES|XOF|N)/i, "");
  if (cleaned === "") return null;
  return /^\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : NaN;
}

function parseStatus(value: string): "ACTIVE" | "DRAFT" | null | "invalid" {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (["active", "live", "published", "publish", "yes", "visible"].includes(v)) return "ACTIVE";
  if (["draft", "hidden", "no", "unpublished"].includes(v)) return "DRAFT";
  return "invalid";
}

const splitList = (value: string) =>
  value.split(/[;|]/).map((s) => s.trim()).filter(Boolean);

export function mapImportTable(table: string[][]): ParsedImport {
  const result: ParsedImport = { rows: [], errors: [], fatal: null, unknownColumns: [] };
  if (table.length === 0) {
    result.fatal = "The file is empty.";
    return result;
  }

  const header = table[0].map((h) => h.trim().toLowerCase().replace(/\*$/, "").trim());
  const columns = header.map((h) => HEADER_ALIASES[h] ?? null);
  result.unknownColumns = table[0].filter((h, i) => h.trim() && !columns[i]).map((h) => h.trim());
  if (!columns.includes("name") || !columns.includes("price")) {
    result.fatal =
      'The first row must be column headings, including "name" and "price". Download the template to see the format.';
    return result;
  }

  const body = table.slice(1);
  if (body.length === 0) {
    result.fatal = "The file has headings but no products.";
    return result;
  }
  if (body.length > MAX_IMPORT_ROWS) {
    result.fatal = `That's ${body.length} products — the limit is ${MAX_IMPORT_ROWS} per import. Split the file and import it in parts.`;
    return result;
  }

  body.forEach((cells, index) => {
    const line = index + 2; // spreadsheet row number (row 1 = headings)
    const raw = {} as RawImportRow;
    columns.forEach((key, i) => {
      if (key && !raw[key]) raw[key] = (cells[i] ?? "").trim();
    });

    const price = parseMoney(raw.price ?? "");
    const compareAtPrice = parseMoney(raw.compareAtPrice ?? "");
    const stockText = (raw.stock ?? "").replace(/[\s,]/g, "");
    const status = parseStatus(raw.status ?? "");
    const name = (raw.name ?? "").replace(/\s+/g, " ").trim();

    const problems: string[] = [];
    if (price === null) problems.push("Price is missing");
    else if (Number.isNaN(price)) problems.push(`Price "${raw.price}" isn't a number`);
    if (Number.isNaN(compareAtPrice)) problems.push(`Compare-at price "${raw.compareAtPrice}" isn't a number`);
    if (stockText && !/^\d+$/.test(stockText)) problems.push(`Stock "${raw.stock}" must be a whole number`);
    if (status === "invalid") problems.push(`Status "${raw.status}" should be "active" or "draft"`);

    const candidate = {
      line,
      name,
      price: price ?? NaN,
      description: raw.description ?? "",
      compareAtPrice: Number.isNaN(compareAtPrice) ? null : compareAtPrice,
      stock: stockText ? Number(stockText) : 0,
      sku: raw.sku ?? "",
      categories: splitList(raw.category ?? ""),
      status: status === "invalid" ? null : status,
      brand: raw.brand ?? "",
      tags: splitList(raw.tags ?? ""),
    };
    const parsed = importRowSchema.safeParse(candidate);
    if (!parsed.success && problems.length === 0) {
      problems.push(parsed.error.issues[0]?.message ?? "Invalid row");
    }
    if (problems.length > 0 || !parsed.success) {
      result.errors.push({ line, name: name || "(no name)", message: problems.join("; ") });
    } else {
      result.rows.push(parsed.data);
    }
  });

  return result;
}
