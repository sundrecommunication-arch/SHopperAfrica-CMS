import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export default function PaymentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Payments</h1>
      <EmptyState icon={CreditCard} title="No payment methods set up." description="Add how customers can pay you — bank transfer, cash on delivery, or an online provider." />
    </div>
  );
}
