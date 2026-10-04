"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRESETS = [
  { key: "all", label: "All time" },
  { key: "today", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
] as const;

/**
 * Self-contained date-range filter used across Overview, Analytics, Orders,
 * and Abandoned Carts -- reads and writes its own `range`/`from`/`to` URL
 * search params (no props needed), so each page's server component just
 * drops this in and reads the same params back via `resolveDateRange`
 * (src/lib/date-range.ts) to scope its own queries.
 */
export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRange = searchParams.get("range") ?? "all";

  const [showCustom, setShowCustom] = useState(activeRange === "custom");
  const [customFrom, setCustomFrom] = useState(searchParams.get("from") ?? "");
  const [customTo, setCustomTo] = useState(searchParams.get("to") ?? "");

  function applyPreset(key: string) {
    setShowCustom(key === "custom");
    if (key === "custom") return; // wait for the customer to pick dates first

    const params = new URLSearchParams();
    if (key !== "all") params.set("range", key);
    router.push(params.toString() ? `${pathname}?${params}` : pathname);
  }

  function applyCustom() {
    if (!customFrom) return;
    const params = new URLSearchParams();
    params.set("range", "custom");
    params.set("from", customFrom);
    if (customTo) params.set("to", customTo);
    router.push(`${pathname}?${params}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
      {PRESETS.map((p) => (
        <Button
          key={p.key}
          type="button"
          size="sm"
          variant={activeRange === p.key ? "default" : "outline"}
          onClick={() => applyPreset(p.key)}
          className="h-8 text-xs"
        >
          {p.label}
        </Button>
      ))}
      <Button
        type="button"
        size="sm"
        variant={activeRange === "custom" ? "default" : "outline"}
        onClick={() => setShowCustom((v) => !v)}
        className="h-8 text-xs"
      >
        Custom
      </Button>

      {showCustom && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-8 w-[150px] text-xs"
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-8 w-[150px] text-xs"
            aria-label="To date"
          />
          <Button type="button" size="sm" onClick={applyCustom} className="h-8 text-xs">
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
