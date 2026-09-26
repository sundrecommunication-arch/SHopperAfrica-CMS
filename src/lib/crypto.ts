import "server-only";
import crypto from "node:crypto";

// Encrypts OAuth tokens before they're written to the database (see
// adAccountConnections in src/db/schema/ads.ts). AES-256-GCM with a random IV
// per call; the IV and auth tag are packed alongside the ciphertext so a
// single string column can store everything needed to decrypt.
//
// AD_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key. Generate one
// with: openssl rand -base64 32
// Never reuse AUTH_SECRET for this — a leaked session secret shouldn't also
// expose every merchant's ad account tokens.

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.AD_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "AD_TOKEN_ENCRYPTION_KEY is not set — generate one with `openssl rand -base64 32` and add it to .env"
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("AD_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded)");
  }
  return key;
}

/** Encrypts a plaintext token, returning a single string safe to store in a text column. */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // iv.authTag.ciphertext, each base64 — dots are safe since base64 never contains them
  return `${iv.toString("base64")}.${authTag.toString("base64")}.${ciphertext.toString("base64")}`;
}

/** Reverses encryptToken. Throws if the value is malformed or the key doesn't match. */
export function decryptToken(packed: string): string {
  const key = getKey();
  const [ivB64, authTagB64, ciphertextB64] = packed.split(".");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed encrypted token — expected iv.authTag.ciphertext");
  }
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
