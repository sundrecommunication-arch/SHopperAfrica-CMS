import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no database calls or bcrypt here (this feeds middleware,
// which runs on the Edge runtime). The Credentials provider itself — which
// needs Node APIs — is added only in src/auth.ts.
export const authConfig = {
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

      if (isOnDashboard || isOnOnboarding) {
        return isLoggedIn;
      }
      return true;
    },
  },
  providers: [], // populated in src/auth.ts
} satisfies NextAuthConfig;
