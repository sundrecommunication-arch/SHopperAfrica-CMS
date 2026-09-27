import "server-only";
import crypto from "node:crypto";
import { eq, and, isNull, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";
import { getAppBaseUrl } from "@/lib/ad-platforms/config";

export class PasswordResetError extends Error {}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Starts a password reset for the given email. Deliberately silent (no error, no
 * indication either way) when the email doesn't match an account — the caller
 * (the API route) always returns the same generic message, so this can't be used
 * to check which emails have accounts.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });

  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

/**
 * Validates a raw reset token (as emailed to the user) and sets the new password.
 * Throws PasswordResetError if the token is missing, expired, or already used —
 * the message is safe to show directly to the user.
 */
export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now)
      )
    )
    .limit(1);

  if (!record) {
    throw new PasswordResetError("This reset link is invalid or has expired. Request a new one.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, updatedAt: now }).where(eq(users.id, record.userId));
    // Mark used rather than deleting — keeps a record that this account's password
    // was reset, and belt-and-suspenders against any race on a double-submit.
    await tx.update(passwordResetTokens).set({ usedAt: now }).where(eq(passwordResetTokens.id, record.id));
  });
}
