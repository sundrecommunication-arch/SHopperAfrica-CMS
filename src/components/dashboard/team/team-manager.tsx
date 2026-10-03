"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Trash2, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TeamRole = "OWNER" | "MANAGER" | "STAFF";
type InvitableRole = "MANAGER" | "STAFF";

interface TeamMember {
  id: string;
  userId: string;
  role: TeamRole;
  createdAt: Date | string;
  name: string | null;
  email: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: TeamRole;
  expiresAt: Date | string;
  createdAt: Date | string;
}

interface TeamManagerProps {
  initialMembers: TeamMember[];
  initialPendingInvites: PendingInvite[];
}

const ROLE_LABEL: Record<TeamRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

export function TeamManager({ initialMembers, initialPendingInvites }: TeamManagerProps) {
  const router = useRouter();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("STAFF");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter an email address");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/stores/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to send invite");

      toast.success(`Invite sent to ${email.trim()}`);
      setEmail("");
      setRole("STAFF");
      setShowInviteForm(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invite");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: InvitableRole) {
    setBusyId(memberId);
    try {
      const res = await fetch(`/api/stores/team/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update role");
      }
      toast.success("Role updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(memberId: string, label: string) {
    if (!confirm(`Remove ${label} from the team?`)) return;
    setBusyId(memberId);
    try {
      const res = await fetch(`/api/stores/team/members/${memberId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to remove team member");
      }
      toast.success("Team member removed");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove team member");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevoke(inviteId: string, inviteEmail: string) {
    if (!confirm(`Revoke the invite sent to ${inviteEmail}?`)) return;
    setBusyId(inviteId);
    try {
      const res = await fetch(`/api/stores/team/invites/${inviteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke invite");
      toast.success("Invite revoked");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke invite");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowInviteForm((prev) => !prev)} size="sm" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          {showInviteForm ? "Cancel" : "Invite Team Member"}
        </Button>
      </div>

      {showInviteForm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Invite by Email
            </CardTitle>
            <CardDescription>
              They&apos;ll get an email with a link to join — works whether or not they already have a
              Shopper account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="invite-email">Email *</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="staff@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as InvitableRole)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="STAFF">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send Invite"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialMembers.map((member) => (
              <TableRow key={member.id} className="hover:bg-muted/40">
                <TableCell className="text-sm font-medium">{member.name ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{member.email}</TableCell>
                <TableCell>
                  {member.role === "OWNER" ? (
                    <Badge variant="default" className="text-[10px]">
                      Owner
                    </Badge>
                  ) : (
                    <Select
                      value={member.role}
                      onValueChange={(v) => handleRoleChange(member.id, v as InvitableRole)}
                      disabled={busyId === member.id}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="STAFF">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {member.role !== "OWNER" && (
                    <button
                      type="button"
                      onClick={() => handleRemove(member.id, member.name ?? member.email)}
                      disabled={busyId === member.id}
                      className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {initialPendingInvites.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Pending Invites</h2>
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialPendingInvites.map((invite) => (
                  <TableRow key={invite.id} className="hover:bg-muted/40">
                    <TableCell className="text-xs text-muted-foreground">{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {ROLE_LABEL[invite.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => handleRevoke(invite.id, invite.email)}
                        disabled={busyId === invite.id}
                        className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Revoke</span>
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {initialMembers.length === 0 && initialPendingInvites.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 px-4 text-center">
          <UserPlus className="h-12 w-12 text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-semibold">No team members yet</h3>
        </div>
      )}
    </div>
  );
}
