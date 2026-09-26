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
