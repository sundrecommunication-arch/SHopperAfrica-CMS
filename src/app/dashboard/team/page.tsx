import React from "react";
import { getCurrentStore } from "@/lib/tenant";
import { listTeam } from "@/modules/stores/services/staff-service";
import { TeamManager } from "@/components/dashboard/team/team-manager";

export default async function TeamPage() {
  const { store, role } = await getCurrentStore();

  if (role !== "OWNER") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-muted-foreground text-sm">
            Only the store owner can manage team members and invites.
          </p>
        </div>
      </div>
    );
  }

  const { members, pendingInvites } = await listTeam(store.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-muted-foreground text-sm">
          Invite staff to help run {store.name}, and manage their access.
        </p>
      </div>

      <TeamManager initialMembers={members} initialPendingInvites={pendingInvites} />
    </div>
  );
}
