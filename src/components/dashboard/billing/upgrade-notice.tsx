import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown in place of a feature the store's plan doesn't include. */
export function UpgradeNotice({ feature, planName }: { feature: string; planName: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-16 text-center">
      <Lock className="h-10 w-10 text-muted-foreground/60" />
      <h3 className="text-base font-semibold">{feature} is on the {planName} plan</h3>
      <p className="max-w-sm text-xs text-muted-foreground">
        Upgrade to unlock it. Plans are paid 30 days at a time — no automatic charges.
      </p>
      <Button asChild size="sm">
        <Link href="/dashboard/billing">See plans</Link>
      </Button>
    </div>
  );
}
