import "server-only";
import webpush from "web-push";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { integrationTokens, pushSubscriptions } from "@/db/schema";

// Web push for the Shopper seller app (service worker: public/sw.js).
//
// VAPID keys identify Shopper to the browsers' push services. They're made
// automatically the first time they're needed and kept in the database
// (integration_tokens), so there's nothing to configure -- and they must
// stay the same forever, or every device would need to subscribe again.
// VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY env vars override them if set.

const VAPID_ROW = "vapid_keys";
let cachedKeys: { publicKey: string; privateKey: string } | null = null;

export async function getVapidKeys() {
  if (cachedKeys) return cachedKeys;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    cachedKeys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    return cachedKeys;
  }
  const [row] = await db.select().from(integrationTokens).where(eq(integrationTokens.key, VAPID_ROW)).limit(1);
  if (row) {
    cachedKeys = JSON.parse(row.value);
    return cachedKeys!;
  }
  const generated = webpush.generateVAPIDKeys();
  // Insert-or-keep: if two servers race, both end up using whichever row won.
  await db
    .insert(integrationTokens)
    .values({ key: VAPID_ROW, value: JSON.stringify(generated), expiresAt: new Date("9999-12-31") })
    .onConflictDoNothing();
  const [saved] = await db.select().from(integrationTokens).where(eq(integrationTokens.key, VAPID_ROW)).limit(1);
  cachedKeys = JSON.parse(saved.value);
  return cachedKeys!;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// The browsers' push services. The server POSTs to whatever endpoint a
// device registers, so anything else is refused (no requests to arbitrary
// URLs). PUSH_TEST_ENDPOINT_ORIGIN allows one extra origin for local tests.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /\.notify\.windows\.com$/];

export function isAllowedPushEndpoint(endpoint: string) {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (process.env.PUSH_TEST_ENDPOINT_ORIGIN && url.origin === process.env.PUSH_TEST_ENDPOINT_ORIGIN) return true;
  return url.protocol === "https:" && PUSH_HOSTS.some((h) => h.test(url.hostname));
}

export async function savePushSubscription(userId: string, sub: PushSubscriptionInput, userAgent: string | null) {
  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
    });
}

export async function removePushSubscription(userId: string, endpoint: string) {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

export interface PushMessage {
  title: string;
  body: string;
  /** Opened when the notification is tapped. */
  url: string;
  /** Same tag = replaces an earlier notification instead of stacking. */
  tag?: string;
}

/**
 * Sends a notification to every device of these users. Best-effort, never
 * throws; devices the push service says are gone (404/410) are forgotten.
 */
export async function sendPushToUsers(userIds: string[], message: PushMessage) {
  if (userIds.length === 0) return { sent: 0, removed: 0 };
  try {
    const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds));
    if (subs.length === 0) return { sent: 0, removed: 0 };
    const keys = await getVapidKeys();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.shopperafrica.com").replace(/\/$/, "");
    const subject = process.env.VAPID_SUBJECT ?? `mailto:${process.env.ADMIN_EMAILS?.split(",")[0]?.trim() || "sundrecommunication@gmail.com"}`;
    const payload = JSON.stringify({ ...message, icon: `${appUrl}/icons/icon-192.png` });

    let sent = 0;
    const gone: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { vapidDetails: { subject, publicKey: keys.publicKey, privateKey: keys.privateKey }, TTL: 60 * 60 * 24, urgency: "high" }
          );
          sent++;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) gone.push(s.id);
          else console.error("push send failed", status, (error as Error).message);
        }
      })
    );
    if (gone.length > 0) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone));
    if (sent > 0) {
      await db
        .update(pushSubscriptions)
        .set({ lastUsedAt: new Date() })
        .where(inArray(pushSubscriptions.userId, userIds));
    }
    return { sent, removed: gone.length };
  } catch (error) {
    console.error("push notifications failed", error);
    return { sent: 0, removed: 0 };
  }
}
