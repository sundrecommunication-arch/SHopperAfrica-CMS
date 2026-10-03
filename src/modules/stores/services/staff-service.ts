import "server-only";
import crypto from "node:crypto";
import { eq, and, isNull, gt } from "drizzle-orm";

import { db } from "@/db";
import { users, storeMembers, storeInvites, stores } from "@/db/schema";
import { sendTeamInviteEmail } from "@/lib/email";
import {
  inviteStaffSchema,
  updateMemberRoleSchema,
  type InviteStaffInput,
  type UpdateMemberRoleInput,
} from "../validation/schemas";
import type { StoreRole } from "@/types/next-auth";

export class StaffServiceError extends Error {}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/** Everyone currently on a store's team, plus any invites still pending. */
export async function listTeam(storeId: string) {
  const members = await db
    .select({
      id: storeMembers.id,
      userId: storeMembers.userId,
      role: storeMembers.role,
      createdAt: storeMembers.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(storeMembers)
    .innerJoin(users, eq(users.id, storeMembers.userId))
    .where(eq(storeMembers.storeId, storeId));

  const pendingInvites = await db
    .select({
      id: storeInvites.id,
      email: storeInvites.email,
      role: storeInvites.role,
      expiresAt: storeInvites.expiresAt,
      createdAt: storeInvites.createdAt,
    })
    .from(storeInvites)
    .where(
      and(
        eq(storeInvites.storeId, storeId),
        isNull(storeInvites.acceptedAt),
        gt(storeInvites.expiresAt, new Date())
      )
    );

  return { members, pendingInvites };
}

/**
 * Invites someone to join a store by email. Works whether or not that email
 * already has a Shopper account — src/app/invite/[token] branches on that at
 * accept time. Re-inviting the same email replaces any prior pending invite.
 */
export async function inviteStaffMember(params: {
  storeId: string;
  invitedByUserId: string;
  origin: string;
  input: InviteStaffInput;
}) {
  const parsed = inviteStaffSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new StaffServiceError(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { email, role } = parsed.data;

  const [store] = await db.select({ name: stores.name }).from(stores).where(eq(stores.id, params.storeId)).limit(1);
  if (!store) {
    throw new StaffServiceError("Store not found");
  }

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) {
    const [existingMembership] = await db
      .select({ id: storeMembers.id })
      .from(storeMembers)
      .where(and(eq(storeMembers.storeId, params.storeId), eq(storeMembers.userId, existingUser.id)))
      .limit(1);
    if (existingMembership) {
      throw new StaffServiceError("That person is already on this store's team");
    }
  }

  // Replace any existing pending invite for this email rather than stacking
  // duplicates — re-inviting is the common "resend" path.
  await db
    .delete(storeInvites)
    .where(and(eq(storeInvites.storeId, params.storeId), eq(storeInvites.email, email)));

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await db.insert(storeInvites).values({
    storeId: params.storeId,
    email,
    role,
    tokenHash,
    invitedByUserId: params.invitedByUserId,
    expiresAt,
  });

  const inviteUrl = `${params.origin}/invite/${rawToken}`;
  await sendTeamInviteEmail(email, { storeName: store.name, inviteUrl, role });
}

export async function revokeInvite(storeId: string, inviteId: string) {
  await db.delete(storeInvites).where(and(eq(storeInvites.id, inviteId), eq(storeInvites.storeId, storeId)));
}

async function assertNotLastOwner(storeId: string, memberIdToChange: string) {
  const owners = await db
    .select({ id: storeMembers.id })
    .from(storeMembers)
    .where(and(eq(storeMembers.storeId, storeId), eq(storeMembers.role, "OWNER")));

  if (owners.length <= 1 && owners.some((o) => o.id === memberIdToChange)) {
    throw new StaffServiceError("A store must always have at least one owner");
  }
}

export async function updateMemberRole(storeId: string, memberId: string, input: UpdateMemberRoleInput) {
  const parsed = updateMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    throw new StaffServiceError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const [member] = await db
    .select({ id: storeMembers.id, role: storeMembers.role })
    .from(storeMembers)
    .where(and(eq(storeMembers.id, memberId), eq(storeMembers.storeId, storeId)))
    .limit(1);
  if (!member) {
    throw new StaffServiceError("Team member not found");
  }
  if (member.role === "OWNER") {
    throw new StaffServiceError("The store owner's role can't be changed here");
  }

  await db.update(storeMembers).set({ role: parsed.data.role }).where(eq(storeMembers.id, memberId));
}

export async function removeMember(storeId: string, memberId: string) {
  const [member] = await db
    .select({ id: storeMembers.id, role: storeMembers.role })
    .from(storeMembers)
    .where(and(eq(storeMembers.id, memberId), eq(storeMembers.storeId, storeId)))
    .limit(1);
  if (!member) {
    throw new StaffServiceError("Team member not found");
  }

  await assertNotLastOwner(storeId, memberId);
  await db.delete(storeMembers).where(eq(storeMembers.id, memberId));
}

interface InviteDetails {
  email: string;
  role: StoreRole;
  storeName: string;
  storeId: string;
  accountExists: boolean;
}

/** Looks up a pending, unexpired invite by its raw (unhashed) token. */
export async function getInviteByToken(rawToken: string): Promise<InviteDetails | null> {
  const tokenHash = hashToken(rawToken);

  const [invite] = await db
    .select({
      email: storeInvites.email,
      role: storeInvites.role,
      storeId: storeInvites.storeId,
      storeName: stores.name,
    })
    .from(storeInvites)
    .innerJoin(stores, eq(stores.id, storeInvites.storeId))
    .where(
      and(eq(storeInvites.tokenHash, tokenHash), isNull(storeInvites.acceptedAt), gt(storeInvites.expiresAt, new Date()))
    )
    .limit(1);

  if (!invite) return null;

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, invite.email)).limit(1);

  return { ...invite, accountExists: !!existingUser };
}

/**
 * Accepts an invite for the given raw token. `userId` is the signed-in user
 * completing it — the caller (the API route) is responsible for having
 * already verified that user's email matches the invite before calling this,
 * for an existing account, or for creating the account first when it's a
 * brand-new email (see POST /api/invites/[token]/accept).
 */
export async function acceptInvite(rawToken: string, userId: string): Promise<{ storeSlug: string }> {
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const [invite] = await db
    .select()
    .from(storeInvites)
    .where(and(eq(storeInvites.tokenHash, tokenHash), isNull(storeInvites.acceptedAt), gt(storeInvites.expiresAt, now)))
    .limit(1);

  if (!invite) {
    throw new StaffServiceError("This invite link is invalid or has expired.");
  }

  const [store] = await db.select({ slug: stores.slug }).from(stores).where(eq(stores.id, invite.storeId)).limit(1);
  if (!store) {
    throw new StaffServiceError("This store no longer exists.");
  }

  await db.transaction(async (tx) => {
    const [existingMembership] = await tx
      .select({ id: storeMembers.id })
      .from(storeMembers)
      .where(and(eq(storeMembers.storeId, invite.storeId), eq(storeMembers.userId, userId)))
      .limit(1);

    if (!existingMembership) {
      await tx.insert(storeMembers).values({ storeId: invite.storeId, userId, role: invite.role });
    }
    await tx.update(storeInvites).set({ acceptedAt: now }).where(eq(storeInvites.id, invite.id));
  });

  return { storeSlug: store.slug };
}
