import "server-only";
import { auth } from "@/auth";

export class NotSignedInError extends Error {}

/** The signed-in user's id, for routes that aren't tied to a store (e.g. the supplier portal). */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new NotSignedInError("Please sign in");
  return session.user.id;
}
