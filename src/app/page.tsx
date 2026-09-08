import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-semibold">
        S
      </span>
      <div className="flex max-w-xl flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">
          The easiest way for a business to start selling online.
        </h1>
        <p className="text-muted-foreground text-lg">
          Create a store, add your products, and take orders on WhatsApp or through
          online payment — no technical knowledge needed.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/signup">Create your store</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
