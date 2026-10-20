import { NextResponse } from "next/server";
import { z } from "zod";

import { NotSignedInError, requireUserId } from "@/lib/current-user";
import {
  isAllowedPushEndpoint,
  removePushSubscription,
  savePushSubscription,
} from "@/modules/notifications/services/push-service";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

/** Turns on order alerts for this device (its browser push subscription). */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || !isAllowedPushEndpoint(parsed.data.endpoint)) {
      return NextResponse.json({ error: "This browser's notification service isn't supported." }, { status: 400 });
    }
    await savePushSubscription(userId, parsed.data, request.headers.get("user-agent")?.slice(0, 300) ?? null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotSignedInError) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    throw error;
  }
}

/** Turns order alerts off for this device. */
export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId();
    const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
    if (body?.endpoint) await removePushSubscription(userId, body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotSignedInError) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    throw error;
  }
}
