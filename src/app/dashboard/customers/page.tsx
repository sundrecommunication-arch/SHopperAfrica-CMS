import { Users } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export default function CustomersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Customers</h1>
      <EmptyState icon={Users} title="No customers yet." description="Customer profiles are created automatically when someone orders." />
    </div>
  );
}
