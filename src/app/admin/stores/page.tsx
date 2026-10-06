import Link from "next/link";
import { listStoresForAdmin } from "@/modules/admin/services/admin-service";
import { PLANS } from "@/modules/subscriptions/plans";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const rows = await listStoresForAdmin({ search: q });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Stores</h1>
          <p className="text-sm text-muted-foreground">{rows.length} store{rows.length === 1 ? "" : "s"}</p>
        </div>
        <form className="w-full max-w-xs">
          <Input name="q" defaultValue={q} placeholder="Search name, link or owner email" />
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id} className="hover:bg-muted/40">
                <TableCell>
                  <Link href={`/admin/stores/${s.id}`} className="font-medium hover:underline">
                    {s.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">/store/{s.slug}</div>
                </TableCell>
                <TableCell className="text-xs">{s.ownerEmail}</TableCell>
                <TableCell className="text-xs">
                  {PLANS[s.effectivePlan].name}
                  {s.isTrial && s.effectivePlan !== "FREE" && " (trial)"}
                  {s.periodEnd && s.effectivePlan !== "FREE" && (
                    <div className="text-muted-foreground">until {s.periodEnd.toLocaleDateString("en-GB")}</div>
                  )}
                </TableCell>
                <TableCell className="text-right text-xs">{s.productCount}</TableCell>
                <TableCell className="text-right text-xs">{s.orderCount}</TableCell>
                <TableCell className="text-right text-xs">
                  {s.currencySymbol}
                  {s.sales.toLocaleString()}
                </TableCell>
                <TableCell>
                  {s.suspendedAt ? (
                    <Badge variant="destructive">Suspended</Badge>
                  ) : s.isPublished ? (
                    <Badge>Live</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
