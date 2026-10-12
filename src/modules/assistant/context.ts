import "server-only";
import { getCurrentStore, TenantError } from "@/lib/tenant";
import { requireUserId } from "@/lib/current-user";
import type { AssistantContext } from "./tools";

/** Who the assistant is working for: the signed-in user and their store, if they have one yet. */
export async function getAssistantContext(): Promise<AssistantContext> {
  try {
    const { store, role, userId } = await getCurrentStore();
    return {
      userId,
      role,
      store: { id: store.id, slug: store.slug, name: store.name, currency: store.currency, currencySymbol: store.currencySymbol },
    };
  } catch (error) {
    if (!(error instanceof TenantError)) throw error;
    // Not signed in throws NotSignedInError here; signed in without a store is fine.
    return { userId: await requireUserId(), store: null, role: null };
  }
}
