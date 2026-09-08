import { DefaultSession } from "next-auth";

export type StoreRole = "OWNER" | "MANAGER" | "STAFF";

export interface SessionStoreMembership {
  storeId: string;
  role: StoreRole;
  storeName: string;
  storeSlug: string;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    stores: SessionStoreMembership[];
    activeStoreId: string | null;
  }
}
