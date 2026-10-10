import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  optOutOfLifecycleEmails,
  verifyUnsubscribeToken,
} from "@/modules/lifecycle/services/lifecycle-service";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

// Landing page for the "Unsubscribe from tips" link in merchant lifecycle
// emails. Asks for a click rather than unsubscribing on page load, so email
// security scanners that open every link don't unsubscribe people.

async function unsubscribe(formData: FormData) {
  "use server";
  const userId = String(formData.get("u") ?? "");
  const token = String(formData.get("t") ?? "");
  if (!userId || !verifyUnsubscribeToken(userId, token)) redirect("/unsubscribe?error=1");
  await optOutOfLifecycleEmails(userId);
  redirect("/unsubscribe?done=1");
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; t?: string; done?: string; error?: string }>;
}) {
  const { u, t, done, error } = await searchParams;
  const valid = Boolean(u && t && verifyUnsubscribeToken(u, t));

  let content;
  if (done) {
    content = (
      <>
        <h1 className="text-2xl font-semibold">You&apos;re unsubscribed</h1>
        <p className="mt-3 text-muted-foreground">
          We won&apos;t send you any more tips or reminder emails. You&apos;ll still get important
          account emails, like order notifications and billing notices.
        </p>
      </>
    );
  } else if (error || !valid) {
    content = (
      <>
        <h1 className="text-2xl font-semibold">This link isn&apos;t valid</h1>
        <p className="mt-3 text-muted-foreground">
          Please use the unsubscribe link from the most recent email, or reply to that email and
          we&apos;ll remove you by hand.
        </p>
      </>
    );
  } else {
    content = (
      <>
        <h1 className="text-2xl font-semibold">Unsubscribe from Shopper tips?</h1>
        <p className="mt-3 text-muted-foreground">
          You&apos;ll stop getting setup tips and reminder emails. Important account emails, like
          order notifications and billing notices, will still arrive.
        </p>
        <form action={unsubscribe} className="mt-6">
          <input type="hidden" name="u" value={u} />
          <input type="hidden" name="t" value={t} />
          <Button type="submit">Unsubscribe</Button>
        </form>
      </>
    );
  }

  return <div className="mx-auto max-w-md px-4 py-24 text-center">{content}</div>;
}
