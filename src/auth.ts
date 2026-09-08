import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users, storeMembers, stores } from "@/db/schema";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user?.passwordHash) return null;

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordsMatch) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      // Attach store memberships on sign-in (or when explicitly refreshed).
      if (user?.id || trigger === "update") {
        const userId = (user?.id ?? token.sub) as string;
        const memberships = await db
          .select({
            storeId: storeMembers.storeId,
            role: storeMembers.role,
            storeName: stores.name,
            storeSlug: stores.slug,
          })
          .from(storeMembers)
          .innerJoin(stores, eq(stores.id, storeMembers.storeId))
          .where(eq(storeMembers.userId, userId));

        token.sub = userId;
        token.stores = memberships;
        token.activeStoreId = memberships[0]?.storeId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
      }
      session.stores = (token.stores as typeof session.stores) ?? [];
      session.activeStoreId = (token.activeStoreId as string | null) ?? null;
      return session;
    },
  },
});
