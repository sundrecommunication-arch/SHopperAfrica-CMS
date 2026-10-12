import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentStore, TenantError } from "@/lib/tenant";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { CreateStoreForm } from "@/components/onboarding/create-store-form";
import { isAssistantEnabled } from "@/modules/assistant/agent";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Not session.stores.length > 0 — that's read from the JWT, which can
  // still be empty for one request right after this very page creates a
  // store (the session cookie hasn't caught up yet). That's exactly what
  // was sending people back to this form after they'd already created a
  // store: getCurrentStore() has the same race but already falls back to a
  // direct DB lookup (see src/lib/tenant.ts), so reuse that here too.
  try {
    await getCurrentStore();
    redirect("/dashboard");
  } catch (error) {
    if (!(error instanceof TenantError)) {
      throw error;
    }
    // No store yet — fall through and show the create-store form below.
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-1 text-center">
          <h1 className="text-xl font-semibold">Let&apos;s set up your store</h1>
          <p className="text-muted-foreground text-sm">Takes less than a minute.</p>
        </div>
        {isAssistantEnabled() && (
          <>
            <Link
              href="/onboarding/assistant"
              className="hover:bg-muted mb-5 flex items-center gap-3 rounded-lg border p-3 text-left transition-colors"
            >
              <Sparkles className="text-primary size-5 shrink-0" />
              <span className="flex flex-col">
                <span className="text-sm font-medium">Set it all up by chatting with AI</span>
                <span className="text-muted-foreground text-xs">
                  Tell our assistant what you sell. It adds your products, delivery, payments and more.
                </span>
              </span>
            </Link>
            <p className="text-muted-foreground mb-4 text-center text-xs">or create your store yourself</p>
          </>
        )}
        <CreateStoreForm />
      </div>
    </div>
  );
}
