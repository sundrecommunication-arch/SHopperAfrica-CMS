import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AssistantChat } from "@/components/assistant/assistant-chat";

export const metadata = { title: "Set up your store with AI" };

export default async function OnboardingAssistantPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // No "already has a store" redirect here: the assistant creates the store
  // mid-conversation, and the merchant should be able to keep chatting.
  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/logo-mark.png" alt="Shopper" width={24} height={24} className="size-6" priority />
          Shopper
        </Link>
        <Link href="/onboarding" className="text-muted-foreground text-xs underline underline-offset-2">
          Use the quick form instead
        </Link>
      </header>
      <AssistantChat variant="onboarding" />
    </div>
  );
}
