import "server-only";
import { notFound } from "next/navigation";
import { auth } from "@/auth";

// Platform admins (docs section 32) are Shopper's own operators -- entirely
// separate from store roles. Who they are is configuration, not data, so no
// merchant can ever grant themselves access: ADMIN_EMAILS on the server,
// comma-separated, defaulting to the founder's account.
const DEFAULT_ADMINS = "sundrecommunication@gmail.com";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? DEFAULT_ADMINS)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdmin(email: string | null | undefined): boolean {
  return Boolean(email) && adminEmails().includes(email!.toLowerCase());
}

export class PlatformAdminError extends Error {}

/**
 * For admin pages: 404s for anyone who isn't an admin, so the panel's
 * existence isn't even revealed. Returns the admin's user id + email.
 */
export async function requirePlatformAdminPage() {
  const session = await auth();
  if (!session?.user?.id || !isPlatformAdmin(session.user.email)) {
    notFound();
  }
  return { userId: session.user.id, email: session.user.email! };
}

/** For admin API routes: throws PlatformAdminError instead of 404ing. */
export async function requirePlatformAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isPlatformAdmin(session.user.email)) {
    throw new PlatformAdminError("Not found");
  }
  return { userId: session.user.id, email: session.user.email! };
}
