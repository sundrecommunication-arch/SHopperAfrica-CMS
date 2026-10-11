import "server-only";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "media";

let cachedClient: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (cachedClient) return cachedClient;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to upload images. See .env.example."
    );
  }
  cachedClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  return cachedClient;
}

let bucketEnsured = false;
async function ensureBucket() {
  if (bucketEnsured) return;
  const client = getClient();
  const { data: buckets } = await client.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await client.storage.createBucket(BUCKET, { public: true });
  }
  bucketEnsured = true;
}

/**
 * Uploads a file under stores/{storeId}/{folder}/ — media is always scoped
 * by tenant so one store can never see or overwrite another's files
 * (docs section 41).
 */
export async function uploadStoreImage(
  storeId: string,
  folder: "products" | "categories" | "branding" | "blog",
  file: File
) {
  await ensureBucket();
  const client = getClient();

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `stores/${storeId}/${folder}/${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await client.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Dropship supplier photos: suppliers/{supplierId}/products/. Kept outside
 * stores/ because many stores' products point at the same supplier photos --
 * deleting one store must never delete them.
 */
export async function uploadSupplierImage(supplierId: string, file: File) {
  await ensureBucket();
  const client = getClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `suppliers/${supplierId}/products/${crypto.randomUUID()}.${ext}`;
  const { error } = await client.storage.from(BUCKET).upload(path, await file.arrayBuffer(), {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Deletes a previously uploaded image, given its public URL. Best-effort. */
export async function deleteStoreImage(publicUrl: string) {
  try {
    const client = getClient();
    const marker = `/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return;
    const path = publicUrl.slice(idx + marker.length);
    await client.storage.from(BUCKET).remove([path]);
  } catch {
    // Best-effort cleanup — not worth failing the request over.
  }
}

/**
 * Deletes every file a store uploaded (stores/{storeId}/**). Used when a
 * platform admin deletes a store. Best-effort: a storage hiccup must not
 * undo or block the database deletion.
 */
export async function deleteAllStoreImages(storeId: string) {
  try {
    const client = getClient();
    const bucket = client.storage.from(BUCKET);
    const folders = ["products", "categories", "branding", "blog"];
    for (const folder of folders) {
      const prefix = `stores/${storeId}/${folder}`;
      // list() pages at 100 by default; keep removing until the folder is empty.
      for (;;) {
        const { data, error } = await bucket.list(prefix, { limit: 100 });
        if (error || !data?.length) break;
        const { error: removeError } = await bucket.remove(data.map((f) => `${prefix}/${f.name}`));
        if (removeError) break;
      }
    }
  } catch (error) {
    console.error(`failed to delete images for store ${storeId}`, error);
  }
}
