import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ATTRIBUTION_COOKIE, parseAttributionCookie } from "@/lib/attribution";
import { CONSENT_COOKIE } from "@/lib/consent";
import { createUser, AuthServiceError } from "@/modules/auth/services/user-service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const jar = await cookies();
    const attribution =
      jar.get(CONSENT_COOKIE)?.value === "denied"
        ? null
        : parseAttributionCookie(jar.get(ATTRIBUTION_COOKIE)?.value);
    const user = await createUser(body, attribution as Record<string, string> | null);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("signup failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
