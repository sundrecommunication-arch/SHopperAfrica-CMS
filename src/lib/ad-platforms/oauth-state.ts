import "server-only";
import crypto from "node:crypto";

// The OAuth `state` parameter round-trips through the ad platform and back
// to our callback route unauthenticated (no session cookie is guaranteed to
// survive that redirect chain on every browser/platform combination), so it
// has to carry — and prove — which store initiated the connection. Signed
// with AUTH_SECRET (the same secret NextAuth already uses to sign session
// tokens) rather than a new env var, since this is the same kind of "prove
// this wasn't tampered with" job.

interface StatePayload {
  storeId: string;
  nonce: string;
  issuedAt: number;
}

const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes is plenty for an OAuth consent redirect

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set — required to sign the OAuth state parameter.");
  }
  return secret;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createOAuthState(storeId: string): string {
  const payload: StatePayload = {
    storeId,
    nonce: crypto.randomBytes(8).toString("hex"),
    issuedAt: Date.now(),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

/** Returns the storeId if `state` is well-formed, correctly signed, and not expired — otherwise null. */
export function verifyOAuthState(state: string): string | null {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;
  if (sign(encoded) !== signature) return null;

  try {
    const payload: StatePayload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (Date.now() - payload.issuedAt > MAX_AGE_MS) return null;
    return payload.storeId;
  } catch {
    return null;
  }
}
