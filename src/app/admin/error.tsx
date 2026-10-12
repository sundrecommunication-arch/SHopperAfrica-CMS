"use client";

import { Button } from "@/components/ui/button";

// Admin-only error screen. In production Next hides the server error's
// message, so show its digest: the same code appears next to the full error
// in the Railway logs.
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-xl font-semibold">This admin page couldn&apos;t load</h1>
      <p className="text-sm text-muted-foreground">
        {error.digest ? (
          <>
            Search the Railway logs for <code className="rounded bg-muted px-1">{error.digest}</code> to see the full error.
          </>
        ) : (
          error.message
        )}
      </p>
      <Button size="sm" variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
