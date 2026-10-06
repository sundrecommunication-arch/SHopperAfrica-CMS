import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no database calls or bcrypt here (this feeds middleware,
// which runs on the Edge runtime). The Credentials provider itself — which
// needs Node APIs — is added only in src/auth.ts.
export const authConfig = {
  // Shopper runs on Railway behind a reverse proxy that forwards every
  // request to the container's internal port without rewriting the Host
  // header (the same reason the Paystack callback URL once read
  // "localhost:8080" instead of the real domain). Without trustHost,
  // NextAuth falls back to that raw internal Host/port for every URL it
  // builds itself — sign-in/sign-out redirects, callback URLs — so e.g.
  // signing out sent the browser to localhost instead of the live domain.
  // trustHost: true tells NextAuth to read the real origin from
  // x-forwarded-host/x-forwarded-proto instead, which Railway's proxy sets
  // correctly. (Vercel sets this for you automatically; self-hosting
  // elsewhere — Railway, Fly, Render, a plain Docker box — always needs it
  // set explicitly.)
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = request.nextUrl.pathname.startsWith("/dashboard");
      const isOnOnboarding = request.nextUrl.pathname.startsWith("/onboarding");
      // /admin only needs a login here; the admin check itself happens
      // server-side in src/lib/platform-admin.ts.
      const isOnAdmin = request.nextUrl.pathname.startsWith("/admin");

      if (isOnDashboard || isOnOnboarding || isOnAdmin) {
        return isLoggedIn;
      }
      return true;
    },
  },
  providers: [], // populated in src/auth.ts
} satisfies NextAuthConfig;
