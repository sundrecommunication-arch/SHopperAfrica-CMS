import { cn } from "@/lib/utils";

/** Small "Soon" tag for features that are built but not switched on yet. */
export function SoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
        className
      )}
    >
      Soon
    </span>
  );
}
