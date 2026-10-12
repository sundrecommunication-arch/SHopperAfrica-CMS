import { listSuppliersForAdmin } from "@/modules/dropship/services/supplier-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminSupplierActions } from "@/components/admin/admin-supplier-actions";

const VARIANT = { PENDING: "default", APPROVED: "outline", REJECTED: "secondary", SUSPENDED: "destructive" } as const;

export default async function AdminSuppliersPage() {
  let rows: Awaited<ReturnType<typeof listSuppliersForAdmin>>;
  try {
    rows = await listSuppliersForAdmin();
  } catch (error) {
    // Admin-only page: show the real reason (usually the database is missing
    // a dropship column, fixed by `npm run db:push`) instead of a blank error.
    console.error("admin suppliers failed", error);
    const cause = error instanceof Error ? ((error.cause as Error | undefined)?.message ?? error.message) : String(error);
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Suppliers</h1>
        <p className="text-sm text-destructive">Couldn&apos;t load suppliers: {cause}</p>
        <p className="text-sm text-muted-foreground">If this mentions a missing column or table, run <code>npm run db:push</code> against the live database.</p>
      </div>
    );
  }
  const pending = rows.filter((r) => r.supplier.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Suppliers</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} supplier{rows.length === 1 ? "" : "s"}
          {pending > 0 && ` · ${pending} waiting for approval`}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No supplier applications yet. Share shopperafrica.com/suppliers with wholesalers.</p>}
        {rows.map(({ supplier: s, productCount, orderCount }) => (
          <Card key={s.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6">
              <div className="min-w-0 space-y-1 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  {s.businessName} <Badge variant={VARIANT[s.status]}>{s.status.toLowerCase()}</Badge>
                </p>
                <p className="text-muted-foreground">
                  {s.email} · {s.phone} · ships from {s.state} · {s.deliveryAreas}, {s.deliveryDays}
                </p>
                <p>{s.description}</p>
                <p className="text-xs text-muted-foreground">
                  Applied {s.createdAt.toLocaleDateString("en-GB")} · {productCount} products · {orderCount} orders
                  {s.statusNote && ` · note: ${s.statusNote}`}
                </p>
              </div>
              <AdminSupplierActions supplierId={s.id} status={s.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
