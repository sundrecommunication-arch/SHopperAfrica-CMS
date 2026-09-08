import { Tag } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export default function DiscountsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Discounts</h1>
      <EmptyState icon={Tag} title="No discounts yet." description="Create a coupon code to run a promotion." />
    </div>
  );
}
