import { NextResponse } from "next/server";
import { getVapidKeys } from "@/modules/notifications/services/push-service";

/** The public VAPID key browsers need to subscribe to Shopper's push notifications. */
export async function GET() {
  const { publicKey } = await getVapidKeys();
  return NextResponse.json({ publicKey });
}
