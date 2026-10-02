import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentStore, TenantError } from "@/lib/tenant";
import { CreateStoreForm } from "@/components/onboarding/create-store-form";

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
        <CreateStoreForm />
      </div>
    </div>
  );
}
