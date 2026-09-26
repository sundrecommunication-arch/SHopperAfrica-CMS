import "server-only";
import { randomBytes } from "crypto";
import { promises as dns } from "dns";

/**
 * Custom-domain support is DNS-based rather than tied to any one hosting
 * platform (Vercel, Railway, a plain VPS, ...) — a merchant proves they
 * control a domain by publishing a TXT record, which works no matter where
 * this app is deployed. See src/app/api/stores/domain/route.ts and
 * src/app/api/stores/domain/verify/route.ts for the API, and
 * src/tasks/verifyDomains.ts for the batch/cron version of the same check.
 *
 * Actually routing traffic for the merchant's domain to this app (pointing
 * DNS + provisioning TLS) still depends on the host: on Vercel that's the
 * project's Domains API (best-effort call in the register route, when
 * VERCEL_PROJECT_ID/VERCEL_TOKEN are set); elsewhere it means the deployment
 * needs a wildcard/multi-domain reverse proxy in front of it.
 */

const DOMAIN_PATTERN = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

export function isValidDomain(domain: string): boolean {
  return DOMAIN_PATTERN.test(domain);
}

/** Generates a random token merchants publish via a TXT record to prove domain ownership. */
export function generateDomainVerificationToken(): string {
  return `shopper-verify-${randomBytes(16).toString("hex")}`;
}

export interface DomainDnsInstructions {
  domain: string;
  cnameTarget: string;
  txtHost: string;
  txtValue: string;
}

/** Builds the DNS records a merchant needs to add for `domain` to point at this app and prove ownership. */
export function getDomainDnsInstructions(domain: string, token: string): DomainDnsInstructions {
  const appHost =
    (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "") ||
    "your-app-domain.com";
  return {
    domain,
    cnameTarget: appHost,
    txtHost: `_shopper-verify.${domain}`,
    txtValue: token,
  };
}

/**
 * Confirms the merchant controls `domain` by checking for a TXT record at
 * `_shopper-verify.<domain>` containing `token`. Works regardless of where
 * the app is hosted — no platform-specific API required.
 */
export async function verifyDomainOwnership(domain: string, token: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(`_shopper-verify.${domain}`);
    return records.some((chunks) => chunks.join("").trim() === token);
  } catch {
    return false;
  }
}
