import "server-only";
import crypto from "node:crypto";
import { and, asc, eq, gt, lt, ne, sql, desc } from "drizzle-orm";

import { db } from "@/db";
import {
  users,
  stores,
  storeMembers,
  products,
  orders,
  subscriptions,
  lifecycleEmails,
  emailOptOuts,
} from "@/db/schema";
import { sendLifecycleEmail, type LifecycleEmailKind } from "@/lib/email";

// Automated emails to merchants after signup:
//
//   WELCOME       right after signup (from /api/signup via after(); the cron
//                 below catches any that failed to send)
//   ONBOARDING    ~1 day after signup: add products, delivery fees, WhatsApp/payments, share link
//   NEED_HELP     ~3 days after signup, still no products: offer WhatsApp/email help
//   NO_ORDERS     ~7 days after signup, has products but no orders yet: promotion tips
//   TRIAL_ENDING  3 days before a trial plan runs out
//
// Each kind is sent at most once per user (unique row in lifecycle_emails).
// Every kind only looks at a short window after its due time, so merchants
// who signed up before this feature existed are never sent a backlog.
// ONBOARDING / NEED_HELP / NO_ORDERS respect the unsubscribe link.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const OPTIONAL_KINDS: LifecycleEmailKind[] = ["ONBOARDING", "NEED_HELP", "NO_ORDERS"];

// Resend's default limit is 2 requests/second; stay under it and keep one
// cron run short. Anything left over goes out on the next hourly run.
const SEND_GAP_MS = 600;
const MAX_PER_KIND = 50;

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.shopperafrica.com").replace(/\/$/, "");
}

// --- Unsubscribe tokens ---------------------------------------------------------
// Signed with AUTH_SECRET so the link works without logging in, but nobody
// can unsubscribe someone else by guessing a user id.

function signUserId(userId: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set — required to sign unsubscribe links.");
  return crypto.createHmac("sha256", secret).update(`unsubscribe:${userId}`).digest("base64url");
}

function unsubscribeQuery(userId: string): string {
  return `u=${encodeURIComponent(userId)}&t=${signUserId(userId)}`;
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = Buffer.from(signUserId(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export async function optOutOfLifecycleEmails(userId: string): Promise<void> {
  await db.insert(emailOptOuts).values({ userId }).onConflictDoNothing();
}

// --- Sending ----------------------------------------------------------------------

async function primaryStore(userId: string) {
  const [store] = await db
    .select({ id: stores.id, name: stores.name, slug: stores.slug })
    .from(stores)
    .where(eq(stores.ownerId, userId))
    .orderBy(asc(stores.createdAt))
    .limit(1);
  return store ?? null;
}

/**
 * Claims the (user, kind) row first so two overlapping runs can't both send,
 * then sends. If Resend fails the claim is released so the next run retries.
 * Returns true if an email went out.
 */
async function sendOnce(
  user: { id: string; email: string; name: string | null },
  kind: LifecycleEmailKind,
  extra: { trialEndsAt?: Date | null } = {}
): Promise<boolean> {
  const [claimed] = await db
    .insert(lifecycleEmails)
    .values({ userId: user.id, kind })
    .onConflictDoNothing()
    .returning({ id: lifecycleEmails.id });
  if (!claimed) return false;

  try {
    const store = await primaryStore(user.id);
    await sendLifecycleEmail(user.email, kind, {
      name: user.name,
      appUrl: appUrl(),
      storeName: store?.name ?? null,
      storeUrl: store ? `${appUrl()}/store/${store.slug}` : null,
      trialEndsAt: extra.trialEndsAt ?? null,
      ...(OPTIONAL_KINDS.includes(kind) && {
        // The link opens a confirm page; mail apps' own "Unsubscribe" button POSTs straight to the API.
        unsubscribeUrl: `${appUrl()}/unsubscribe?${unsubscribeQuery(user.id)}`,
        oneClickUnsubscribeUrl: `${appUrl()}/api/email/unsubscribe?${unsubscribeQuery(user.id)}`,
      }),
    });
    return true;
  } catch (error) {
    await db.delete(lifecycleEmails).where(eq(lifecycleEmails.id, claimed.id));
    throw error;
  }
}

/** Welcome email, called right after signup. Never throws — signup must not fail because of email. */
export async function sendWelcomeEmail(userId: string): Promise<void> {
  try {
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (user) await sendOnce(user, "WELCOME");
  } catch (error) {
    console.error("welcome email failed", error);
  }
}

// --- Hourly run ---------------------------------------------------------------------

const notSent = (kind: LifecycleEmailKind) =>
  sql`not exists (select 1 from ${lifecycleEmails} where ${lifecycleEmails.userId} = ${users.id} and ${lifecycleEmails.kind} = ${kind})`;
const notOptedOut = sql`not exists (select 1 from ${emailOptOuts} where ${emailOptOuts.userId} = ${users.id})`;
// Staff invited onto someone else's store didn't sign up to sell -- skip the merchant tips.
const notJustStaff = sql`(not exists (select 1 from ${storeMembers} where ${storeMembers.userId} = ${users.id} and ${storeMembers.role} <> 'OWNER')
  or exists (select 1 from ${stores} where ${stores.ownerId} = ${users.id}))`;
const productCount = sql<number>`(select count(*) from ${products} join ${stores} s on s.id = ${products.storeId} where s.owner_id = ${users.id})`;
const orderCount = sql<number>`(select count(*) from ${orders} join ${stores} s on s.id = ${orders.storeId} where s.owner_id = ${users.id})`;

function signedUpBetween(fromAgoMs: number, toAgoMs: number) {
  const now = Date.now();
  return and(gt(users.createdAt, new Date(now - fromAgoMs)), lt(users.createdAt, new Date(now - toAgoMs)));
}

const userFields = { id: users.id, email: users.email, name: users.name };

async function dueUsers(kind: LifecycleEmailKind) {
  switch (kind) {
    case "WELCOME":
      // Normally sent at signup; this only retries failures from the last 2 days.
      return db
        .select(userFields)
        .from(users)
        .where(and(signedUpBetween(2 * DAY, 15 * 60 * 1000), notSent(kind)))
        .limit(MAX_PER_KIND);
    case "ONBOARDING":
      return db
        .select(userFields)
        .from(users)
        .where(and(signedUpBetween(3 * DAY, DAY), notSent(kind), notOptedOut, notJustStaff))
        .limit(MAX_PER_KIND);
    case "NEED_HELP":
      return db
        .select(userFields)
        .from(users)
        .where(and(signedUpBetween(6 * DAY, 3 * DAY), notSent(kind), notOptedOut, notJustStaff, sql`${productCount} = 0`))
        .limit(MAX_PER_KIND);
    case "NO_ORDERS":
      return db
        .select(userFields)
        .from(users)
        .where(and(signedUpBetween(10 * DAY, 7 * DAY), notSent(kind), notOptedOut, sql`${productCount} > 0`, sql`${orderCount} = 0`))
        .limit(MAX_PER_KIND);
    case "TRIAL_ENDING":
      return [];
  }
}

async function dueTrialEndings() {
  const now = new Date();
  return db
    .select({ ...userFields, trialEndsAt: subscriptions.currentPeriodEnd })
    .from(subscriptions)
    .innerJoin(stores, eq(stores.id, subscriptions.storeId))
    .innerJoin(users, eq(users.id, stores.ownerId))
    .where(
      and(
        eq(subscriptions.isTrial, true),
        ne(subscriptions.plan, "FREE"),
        gt(subscriptions.currentPeriodEnd, now),
        lt(subscriptions.currentPeriodEnd, new Date(now.getTime() + 3 * DAY)),
        notSent("TRIAL_ENDING")
      )
    )
    .limit(MAX_PER_KIND);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runLifecycleEmails() {
  const sent: Record<LifecycleEmailKind, number> = {
    WELCOME: 0,
    ONBOARDING: 0,
    NEED_HELP: 0,
    NO_ORDERS: 0,
    TRIAL_ENDING: 0,
  };
  const failed: string[] = [];

  const queue: { user: { id: string; email: string; name: string | null }; kind: LifecycleEmailKind; trialEndsAt?: Date | null }[] = [];
  for (const kind of ["WELCOME", "ONBOARDING", "NEED_HELP", "NO_ORDERS"] as const) {
    for (const user of await dueUsers(kind)) queue.push({ user, kind });
  }
  for (const row of await dueTrialEndings()) {
    queue.push({ user: row, kind: "TRIAL_ENDING", trialEndsAt: row.trialEndsAt });
  }

  for (const item of queue) {
    try {
      if (await sendOnce(item.user, item.kind, { trialEndsAt: item.trialEndsAt })) {
        sent[item.kind] += 1;
        await sleep(SEND_GAP_MS);
      }
    } catch (error) {
      console.error(`lifecycle ${item.kind} email to ${item.user.id} failed`, error);
      failed.push(`${item.kind}:${item.user.id}`);
    }
  }

  return { sent, failed };
}

/** For /admin/stores/[id]: which lifecycle emails the owner has had, and whether they unsubscribed. */
export async function getLifecycleHistory(userId: string) {
  const [history, [optOut]] = await Promise.all([
    db
      .select({ kind: lifecycleEmails.kind, sentAt: lifecycleEmails.sentAt })
      .from(lifecycleEmails)
      .where(eq(lifecycleEmails.userId, userId))
      .orderBy(desc(lifecycleEmails.sentAt)),
    db.select({ createdAt: emailOptOuts.createdAt }).from(emailOptOuts).where(eq(emailOptOuts.userId, userId)).limit(1),
  ]);
  return { history, optedOutAt: optOut?.createdAt ?? null };
}
