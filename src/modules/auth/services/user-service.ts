import "server-only";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { db } from "@/db";
import { users } from "@/db/schema";
import { signUpSchema, type SignUpInput } from "../validation/schemas";

export class AuthServiceError extends Error {}

/** Creates a new user account. Throws AuthServiceError on bad input or a duplicate email. */
export async function createUser(input: SignUpInput, attribution?: Record<string, string> | null) {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthServiceError(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { name, email, password } = parsed.data;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    throw new AuthServiceError("An account with that email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash, signupAttribution: attribution ?? null })
    .returning({ id: users.id, email: users.email, name: users.name });

  return user;
}
