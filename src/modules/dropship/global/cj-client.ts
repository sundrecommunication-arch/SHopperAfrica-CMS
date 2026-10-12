import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { integrationTokens } from "@/db/schema";

// Minimal client for CJ Dropshipping's API v2.0, used with Shopper's own CJ
// account (CJ_API_KEY). Docs: https://developers.cjdropshipping.com/en/api/api2/
//
// Field names below follow CJ's documented responses; every read is
// defensive (CJ sometimes returns numbers as strings, or null lists) and any
// failure surfaces as a CjError with CJ's own message, which the admin
// "Worldwide" status card shows.

export class CjError extends Error {}

const BASE = (process.env.CJ_API_BASE ?? "https://developers.cjdropshipping.com/api2.0/v1").replace(/\/$/, "");
const TOKEN_KEY = "cj_access_token";

export function cjConfigured() {
  return Boolean(process.env.CJ_API_KEY);
}

async function fetchNewToken(): Promise<{ token: string; expiresAt: Date }> {
  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) throw new CjError("Worldwide dropshipping isn't set up yet (CJ_API_KEY missing).");
  const res = await fetch(`${BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, ...(process.env.CJ_EMAIL && { email: process.env.CJ_EMAIL }) }),
  });
  const body = await res.json().catch(() => null);
  const data = body?.data;
  if (!res.ok || !body?.result || !data?.accessToken) {
    throw new CjError(`CJ login failed: ${body?.message ?? res.statusText}`);
  }
  // CJ tokens last ~15 days; refresh a day early.
  const expiry = data.accessTokenExpiryDate ? new Date(data.accessTokenExpiryDate) : new Date(Date.now() + 14 * 864e5);
  return { token: data.accessToken as string, expiresAt: new Date(expiry.getTime() - 864e5) };
}

/** Cached in the database: CJ only allows a new token every few minutes. */
async function accessToken(forceNew = false): Promise<string> {
  if (!forceNew) {
    const [row] = await db.select().from(integrationTokens).where(eq(integrationTokens.key, TOKEN_KEY)).limit(1);
    if (row && row.expiresAt.getTime() > Date.now()) return row.value;
  }
  const { token, expiresAt } = await fetchNewToken();
  await db
    .insert(integrationTokens)
    .values({ key: TOKEN_KEY, value: token, expiresAt })
    .onConflictDoUpdate({ target: integrationTokens.key, set: { value: token, expiresAt, updatedAt: new Date() } });
  return token;
}

async function cj<T = unknown>(path: string, init: { method?: "GET" | "POST"; query?: Record<string, string | number | undefined>; body?: unknown } = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  const send = async (token: string) =>
    fetch(url, {
      method: init.method ?? "GET",
      headers: { "CJ-Access-Token": token, "Content-Type": "application/json" },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  let res = await send(await accessToken());
  if (res.status === 401) res = await send(await accessToken(true)); // token revoked/expired early
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.result === false || (body.code && body.code !== 200)) {
    throw new CjError(body?.message ?? `CJ request failed (${res.status})`);
  }
  return body.data as T;
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").split("--")[0]);
  return Number.isFinite(n) ? n : 0;
};

// --- Products ---------------------------------------------------------------------

export interface CjListProduct {
  pid: string;
  name: string;
  image: string | null;
  priceUsd: number;
  category: string | null;
}

export async function searchCjProducts(keyword: string, page = 1, pageSize = 24): Promise<{ items: CjListProduct[]; total: number }> {
  const data = await cj<{ list?: Record<string, unknown>[]; total?: number }>("/product/list", {
    query: { productNameEn: keyword, pageNum: page, pageSize },
  });
  const items = (data?.list ?? []).map((p) => ({
    pid: String(p.pid),
    name: String(p.productNameEn ?? p.productName ?? ""),
    image: (p.productImage as string) ?? null,
    priceUsd: num(p.sellPrice),
    category: (p.categoryName as string) ?? null,
  }));
  return { items: items.filter((i) => i.pid && i.name), total: num(data?.total) };
}

export interface CjVariant {
  vid: string;
  name: string;
  options: Record<string, string>;
  priceUsd: number;
  image: string | null;
}

export interface CjProduct {
  pid: string;
  name: string;
  description: string;
  images: string[];
  category: string | null;
  variants: CjVariant[];
}

function parseImages(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return v.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

/** "Black-XL" with productKeyEn "Color-Size" -> { Color: "Black", Size: "XL" }. */
function variantOptions(keyNames: string | null, variantKey: string | null): Record<string, string> {
  if (!variantKey) return {};
  const values = variantKey.split("-").map((s) => s.trim());
  const names = (keyNames ?? "").split("-").map((s) => s.trim());
  return Object.fromEntries(values.map((v, i) => [names[i] || (values.length === 1 ? "Option" : `Option ${i + 1}`), v]));
}

export async function getCjProduct(pid: string): Promise<CjProduct> {
  const p = await cj<Record<string, unknown>>("/product/query", { query: { pid } });
  if (!p?.pid) throw new CjError("Product not found on CJ");
  const keyNames = (p.productKeyEn as string) ?? null;
  const variants = ((p.variants as Record<string, unknown>[]) ?? []).map((v) => {
    const key = (v.variantKey as string) ?? null;
    return {
      vid: String(v.vid),
      name: String(key ?? v.variantNameEn ?? "Default"),
      options: variantOptions(keyNames, key),
      priceUsd: num(v.variantSellPrice ?? p.sellPrice),
      image: (v.variantImage as string) ?? null,
    };
  });
  return {
    pid: String(p.pid),
    name: String(p.productNameEn ?? ""),
    // CJ descriptions are HTML; keep it as plain text for our stores.
    description: String(p.description ?? "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 4000),
    images: parseImages(p.productImageSet ?? p.productImage).slice(0, 8),
    category: (p.categoryName as string) ?? null,
    variants: variants.filter((v) => v.vid),
  };
}

/** Units CJ can ship for a variant (all warehouses). */
export async function getCjVariantStock(vid: string): Promise<number> {
  const rows = await cj<Record<string, unknown>[] | null>("/product/stock/queryByVid", { query: { vid } });
  return (rows ?? []).reduce((n, r) => n + num(r.totalInventoryNum ?? r.storageNum ?? r.totalInventory), 0);
}

// --- Shipping ----------------------------------------------------------------------

export interface CjFreightOption {
  logisticName: string;
  priceUsd: number;
  days: string;
}

/** Shipping options from CJ's warehouses to a country, cheapest first. */
export async function quoteCjFreight(items: { vid: string; quantity: number }[], countryCode: string): Promise<CjFreightOption[]> {
  const rows = await cj<Record<string, unknown>[] | null>("/logistic/freightCalculate", {
    method: "POST",
    body: { startCountryCode: "CN", endCountryCode: countryCode, products: items },
  });
  return (rows ?? [])
    .map((r) => ({ logisticName: String(r.logisticName ?? ""), priceUsd: num(r.logisticPrice), days: String(r.logisticAging ?? "") }))
    .filter((r) => r.logisticName && r.priceUsd > 0)
    .sort((a, b) => a.priceUsd - b.priceUsd);
}

// --- Orders ------------------------------------------------------------------------

export interface CjOrderInput {
  orderNumber: string; // ours; CJ rejects duplicates, so retries can't double-order
  countryCode: string;
  country: string;
  province: string;
  city: string;
  address: string;
  customerName: string;
  phone: string;
  email?: string | null;
  logisticName: string;
  items: { vid: string; quantity: number }[];
}

export async function createCjOrder(o: CjOrderInput): Promise<{ orderId: string }> {
  const data = await cj<Record<string, unknown>>("/shopping/order/createOrderV2", {
    method: "POST",
    body: {
      orderNumber: o.orderNumber,
      shippingCountryCode: o.countryCode,
      shippingCountry: o.country,
      shippingProvince: o.province,
      shippingCity: o.city,
      shippingAddress: o.address,
      shippingCustomerName: o.customerName,
      shippingPhone: o.phone,
      email: o.email ?? undefined,
      logisticName: o.logisticName,
      fromCountryCode: "CN",
      products: o.items,
    },
  });
  const orderId = String(data?.orderId ?? data?.id ?? "");
  if (!orderId) throw new CjError("CJ didn't return an order id");
  return { orderId };
}

/** Pays a CJ order from Shopper's CJ wallet balance. */
export async function payCjOrder(orderId: string) {
  await cj("/shopping/pay/payBalance", { method: "POST", body: { orderId } });
}

export async function getCjOrder(orderId: string): Promise<{ status: string; trackingNumber: string | null; logisticName: string | null }> {
  const d = await cj<Record<string, unknown>>("/shopping/order/getOrderDetail", { query: { orderId } });
  return {
    status: String(d?.orderStatus ?? ""),
    trackingNumber: (d?.trackNumber as string) || null,
    logisticName: (d?.logisticName as string) || null,
  };
}
