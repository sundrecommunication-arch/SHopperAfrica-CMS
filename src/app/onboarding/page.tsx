import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CreateStoreForm } from "@/components/onboarding/create-store-form";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.stores.length > 0) {
    redirect("/dashboard");
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
