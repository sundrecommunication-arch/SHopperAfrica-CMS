import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authConfig } from "@/auth.config";

// Next.js renamed the "middleware" file convention to "proxy" — this runs on
// the server before a route renders and gates /dashboard + /onboarding.
const { auth } = NextAuth(authConfig);

export function proxy(request: NextRequest) {
  // @ts-expect-error - next-auth's `auth` wrapper accepts the proxy/middleware request shape
  return auth(request);
}

export const config = {
  // Skip static files, images and the API routes themselves.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};
