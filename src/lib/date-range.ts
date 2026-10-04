// Shared date-range resolution for the dashboard's Daily/Weekly/Monthly/
// Custom filter (DateRangeFilter component). Each page reads its own
// `searchParams` and passes them here to get actual Date bounds, instead of
// each page parsing `range`/`from`/`to` itself.

export type DateRangeKey = "all" | "today" | "week" | "month" | "custom";

export interface ResolvedDateRange {
  key: DateRangeKey;
  from: Date | null;
  to: Date | null;
  label: string;
}

/**
 * `to` stays null for the built-in presets (open-ended, meaning "up through
 * right now") -- only a Custom range sets an explicit upper bound, since
 * the store's current moment should never need to be re-stated in the URL.
 */
export function resolveDateRange(sp: {
  range?: string;
  from?: string;
  to?: string;
}): ResolvedDateRange {
  const key = (sp.range as DateRangeKey) || "all";

  if (key === "today") {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    return { key, from, to: null, label: "Today" };
  }
  if (key === "week") {
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { key, from, to: null, label: "Last 7 days" };
  }
  if (key === "month") {
    const from = new Date();
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);
    return { key, from, to: null, label: "Last 30 days" };
  }
  if (key === "custom" && sp.from) {
    const from = new Date(`${sp.from}T00:00:00`);
    const to = sp.to ? new Date(`${sp.to}T23:59:59`) : null;
    return { key, from, to, label: "Custom range" };
  }

  return { key: "all", from: null, to: null, label: "All time" };
}
