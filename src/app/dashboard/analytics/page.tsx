import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <EmptyState icon={BarChart3} title="Not enough data yet." description="Once you have orders, your sales and performance will show up here." />
    </div>
  );
}
