import { Badge } from "@/components/ui/badge";

const LABEL: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  NEW: { text: "New — to deliver", variant: "default" },
  ACCEPTED: { text: "Preparing", variant: "secondary" },
  SHIPPED: { text: "Shipped", variant: "outline" },
  DELIVERED: { text: "Delivered", variant: "outline" },
  CANCELLED: { text: "Cancelled", variant: "destructive" },
};

export function SupplierOrderStatusBadge({ status }: { status: string }) {
  const l = LABEL[status] ?? { text: status, variant: "outline" as const };
  return <Badge variant={l.variant}>{l.text}</Badge>;
}
