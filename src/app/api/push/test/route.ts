import { NextResponse } from "next/server";

import { NotSignedInError, requireUserId } from "@/lib/current-user";
import { sendPushToUsers } from "@/modules/notifications/services/push-service";

/** Sends a test alert to the signed-in user's devices. */
export async function POST() {
  try {
    const userId = await requireUserId();
    const result = await sendPushToUsers([userId], {
      title: "Order alerts are working",
      body: "You'll get a notification like this the moment a new order comes in.",
      url: "/dashboard/orders",
      tag: "shopper-test",
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NotSignedInError) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    throw error;
  }
}
