import { slugify } from "../validation/schemas";

// Matches photo file names to products for bulk photo upload, e.g.
//   "Ankara Midi Dress.jpg"      -> product "Ankara Midi Dress"
//   "ankara-midi-dress-2.jpg"    -> same product (2nd photo), unless a
//                                   product's URL is literally "ankara-midi-dress-2"
//   "shea-butter-250g front.png" -> "Shea Butter 250g" (name at the start)
//   "DRS-001.jpg"                -> the product with SKU DRS-001
// Camera names like IMG_2041.jpg won't match; the merchant picks by hand.

export interface MatchableProduct {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
}

/** Strips the extension and trailing copy/photo numbers: "dress (2).jpg" -> "dress". */
function baseKey(fileName: string) {
  const withoutExt = fileName.replace(/\.[a-z0-9]{2,5}$/i, "");
  return slugify(withoutExt);
}

function withoutNumbering(key: string) {
  return key.replace(/-(\d{1,2}|copy)$/, "");
}

export function matchPhotoToProduct(fileName: string, products: MatchableProduct[]): string | null {
  const key = baseKey(fileName);
  if (!key) return null;

  const index = new Map<string, string>();
  for (const p of products) {
    for (const k of [p.slug, slugify(p.name), p.sku ? slugify(p.sku) : ""]) {
      if (k && !index.has(k)) index.set(k, p.id);
    }
  }

  // 1. Exact (file name is the product name, URL or SKU).
  const exact = index.get(key);
  if (exact) return exact;

  // 2. Same, ignoring a trailing photo number: "dress-2", "dress (3)", "dress copy".
  const stripped = withoutNumbering(key);
  if (stripped !== key && index.has(stripped)) return index.get(stripped)!;

  // 3. File name starts with a product's name: "shea-butter-250g-front".
  //    Longest wins so "ankara-midi-dress-red" beats "ankara".
  let best: { id: string; length: number } | null = null;
  for (const [k, id] of index) {
    if (k.length >= 3 && key.startsWith(`${k}-`) && (!best || k.length > best.length)) {
      best = { id, length: k.length };
    }
  }
  return best?.id ?? null;
}
