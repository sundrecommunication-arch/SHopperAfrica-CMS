import "server-only";
import bcrypt from "bcryptjs";
import { and, eq, or } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/db";
import { customers, customerSessions } from "@/db/schema";
import type { CustomerSignupInput, CustomerLoginInput } from "../validation/schemas";

// Storefront customer accounts are entirely separate from the merchant/staff
// NextAuth session system (src/auth.ts) -- different table, different cookie,
// scoped per store slug so a shopper can be logged into several different
// stores' accounts in the same browser without the sessions colliding.
const SESSION_TTL_DAYS = 30;

export class CustomerAuthError extends Error {}

function cookieName(storeSlug: string) {
  return `shopper_customer_session_${storeSlug}`;
}

async function createSession(customerId: string) {
  const sessionToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(customerSessions).values({ sessionToken, customerId, expires });
  return { sessionToken, expires };
}

async function setSessionCookie(storeSlug: string, session: { sessionToken: string; expires: Date }) {
  const store = await cookies();
  store.set(cookieName(storeSlug), session.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expires,
  });
}

/**
 * Creates a password on a customer record. If a guest-checkout customer
 * already exists for this phone number (customers are unique per
 * store+phone), this claims that same row in place instead of inserting a
 * new one -- which is what makes their past guest orders show up
 * automatically in order history, since they share the same customerId.
 */
export async function signUpCustomer(storeId: string, storeSlug: string, input: CustomerSignupInput) {
  const email = input.email?.trim() || null;
  const phone = input.phone.trim();

  const [existingByPhone] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.storeId, storeId), eq(customers.phone, phone)))
    .limit(1);

  if (existingByPhone?.passwordHash) {
    throw new CustomerAuthError(
      "An account with this phone number already exists. Try signing in instead."
    );
  }

  if (email) {
    const [existingByEmail] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.storeId, storeId), eq(customers.email, email)))
      .limit(1);
    if (existingByEmail?.passwordHash && existingByEmail.id !== existingByPhone?.id) {
      throw new CustomerAuthError(
        "An account with this email already exists. Try signing in instead."
      );
    }
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  let customer;

  if (existingByPhone) {
    [customer] = await db
      .update(customers)
      .set({
        passwordHash,
        name: input.name.trim() || existingByPhone.name,
        email: email ?? existingByPhone.email,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, existingByPhone.id))
      .returning();
  } else {
    [customer] = await db
      .insert(customers)
      .values({ storeId, name: input.name.trim(), phone, email, passwordHash })
      .returning();
  }

  const session = await createSession(customer.id);
  await setSessionCookie(storeSlug, session);
  return customer;
}

export async function logInCustomer(storeId: string, storeSlug: string, input: CustomerLoginInput) {
  const identifier = input.identifier.trim();

  const [customer] = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.storeId, storeId),
        or(eq(customers.phone, identifier), eq(customers.email, identifier))
      )
    )
    .limit(1);

  if (!customer?.passwordHash) {
    throw new CustomerAuthError("No account found with that phone number or email.");
  }

  const valid = await bcrypt.compare(input.password, customer.passwordHash);
  if (!valid) {
    throw new CustomerAuthError("Incorrect password.");
  }

  const session = await createSession(customer.id);
  await setSessionCookie(storeSlug, session);
  return customer;
}

export async function logOutCustomer(storeSlug: string) {
  const store = await cookies();
  const token = store.get(cookieName(storeSlug))?.value;
  if (token) {
    await db.delete(customerSessions).where(eq(customerSessions.sessionToken, token));
  }
  store.delete(cookieName(storeSlug));
}

/** Server-side only -- reads the current customer session for a given store, or null. */
export async function getCurrentCustomer(storeId: string, storeSlug: string) {
  const store = await cookies();
  const token = store.get(cookieName(storeSlug))?.value;
  if (!token) return null;

  const [row] = await db
    .select({ customer: customers, session: customerSessions })
    .from(customerSessions)
    .innerJoin(customers, eq(customerSessions.customerId, customers.id))
    .where(eq(customerSessions.sessionToken, token))
    .limit(1);

  if (!row || row.session.expires < new Date() || row.customer.storeId !== storeId) {
    return null;
  }

  return row.customer;
}
