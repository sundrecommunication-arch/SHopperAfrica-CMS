// One-off: gives every store that existed before plans launched a 30-day
// Business trial (they were promised everything free during early access).
// Safe to re-run -- skips any store that already has a trial or a paid plan.
//
//   npm run db:start-trials
import { eq } from "drizzle-orm";
import { db } from "../index";
import { stores, subscriptions } from "../schema";

const PERIOD_DAYS = 30;

async function main() {
  const rows = await db
    .select({ id: stores.id, name: stores.name, plan: subscriptions.plan, isTrial: subscriptions.isTrial, subId: subscriptions.id })
    .from(stores)
    .leftJoin(subscriptions, eq(subscriptions.storeId, stores.id));

  const trialEnd = new Date(Date.now() + PERIOD_DAYS * 24 * 60 * 60 * 1000);
  let started = 0;

  for (const row of rows) {
    if (row.isTrial || (row.plan && row.plan !== "FREE")) {
      console.log(`skip  ${row.name} (already ${row.isTrial ? "on trial" : row.plan})`);
      continue;
    }
    const values = {
      plan: "BUSINESS" as const,
      status: "ACTIVE" as const,
      currentPeriodEnd: trialEnd,
      isTrial: true,
      updatedAt: new Date(),
    };
    if (row.subId) {
      await db.update(subscriptions).set(values).where(eq(subscriptions.id, row.subId));
    } else {
      await db.insert(subscriptions).values({ storeId: row.id, ...values });
    }
    await db.update(stores).set({ plan: "BUSINESS", updatedAt: new Date() }).where(eq(stores.id, row.id));
    started += 1;
    console.log(`trial ${row.name} -> Business until ${trialEnd.toDateString()}`);
  }

  console.log(`\nDone: ${started} trial(s) started.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
