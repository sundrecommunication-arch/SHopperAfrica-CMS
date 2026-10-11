import { listUsersWithoutStore } from "@/modules/admin/services/admin-service";
import { AdminDeleteUserButton } from "@/components/admin/admin-delete-user-button";
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

export default async function AdminUsersWithoutStorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const rows = await listUsersWithoutStore({ search: q });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Accounts without a store</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} account{rows.length === 1 ? "" : "s"} that signed up but never created a store
          </p>
        </div>
        <form className="w-full max-w-xs">
          <Input name="q" defaultValue={q} placeholder="Search name or email" />
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Signed up</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Team member of</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No accounts without a store.
                </TableCell>
              </TableRow>
            )}
            {rows.map((u) => (
              <TableRow key={u.id} className="hover:bg-muted/40">
                <TableCell>
                  <div className="font-medium">{u.email}</div>
                  {u.name && <div className="text-xs text-muted-foreground">{u.name}</div>}
                </TableCell>
                <TableCell className="text-xs">{u.createdAt.toLocaleDateString("en-GB")}</TableCell>
                <TableCell className="text-xs">{u.source ?? "direct"}</TableCell>
                <TableCell className="text-xs">{u.teamStores ?? "—"}</TableCell>
                <TableCell>
                  {u.isAdmin ? (
                    <Badge variant="secondary">Admin</Badge>
                  ) : (
                    <AdminDeleteUserButton userId={u.id} email={u.email} />
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
