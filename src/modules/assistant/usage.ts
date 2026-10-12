import "server-only";
import { desc, gte, sql, count, countDistinct, eq } from "drizzle-orm";

import { db } from "@/db";
import { aiConversations, aiTurns, stores, users } from "@/db/schema";

// Cost estimates for the AI assistant, from the token counts logged per
// message (ai_turns). Claude Opus 5.5 list prices in USD per million tokens;
// thinking is billed as output. The Anthropic billing page is the source of
// truth -- a request that fell back to another model bills at that model's
// rates, which these figures don't see.
export const AI_RATES_USD_PER_MTOK = { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 } as const;

interface Tokens {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export function estimateCostUsd(t: Tokens) {
  const r = AI_RATES_USD_PER_MTOK;
  return (t.input * r.input + t.output * r.output + t.cacheRead * r.cacheRead + t.cacheWrite * r.cacheWrite) / 1_000_000;
}

// coalesce: sum() over no rows is null.
const total = (column: string) => sql<number>`coalesce(sum(${aiTurns}.${sql.raw(column)}), 0)`.mapWith(Number);

const tokenSums = {
  messages: count(),
  merchants: countDistinct(aiTurns.userId),
  input: total("input_tokens"),
  output: total("output_tokens"),
  cacheRead: total("cache_read_tokens"),
  cacheWrite: total("cache_write_tokens"),
  actions: total("tool_calls"),
};

function withCost<T extends Partial<Tokens>>(row: T) {
  const t = { input: row.input ?? 0, output: row.output ?? 0, cacheRead: row.cacheRead ?? 0, cacheWrite: row.cacheWrite ?? 0 };
  return { ...row, ...t, costUsd: estimateCostUsd(t) };
}

// Days are counted in Lagos time (timestamps are stored in UTC).
const lagosDay = sql<string>`to_char(((${aiTurns}.created_at at time zone 'UTC') at time zone 'Africa/Lagos')::date, 'YYYY-MM-DD')`;

function lagosMidnightUtc(daysAgo = 0) {
  // Lagos is UTC+1 all year (no daylight saving).
  const nowLagos = new Date(Date.now() + 60 * 60 * 1000);
  const midnight = Date.UTC(nowLagos.getUTCFullYear(), nowLagos.getUTCMonth(), nowLagos.getUTCDate() - daysAgo);
  return new Date(midnight - 60 * 60 * 1000);
}

export async function getAiUsageReport() {
  const windowStart = { today: lagosMidnightUtc(0), week: lagosMidnightUtc(6), month: lagosMidnightUtc(29) };
  const totals = (since?: Date) =>
    db
      .select(tokenSums)
      .from(aiTurns)
      .where(since ? gte(aiTurns.createdAt, since) : undefined)
      .then(([row]) => withCost(row));

  const [today, week, month, allTime, daily, topMerchants, [conversations]] = await Promise.all([
    totals(windowStart.today),
    totals(windowStart.week),
    totals(windowStart.month),
    totals(),
    db
      .select({ day: lagosDay, ...tokenSums })
      .from(aiTurns)
      .where(gte(aiTurns.createdAt, windowStart.month))
      .groupBy(lagosDay)
      .orderBy(desc(lagosDay)),
    db
      .select({
        userId: aiTurns.userId,
        email: users.email,
        name: users.name,
        store: sql<string | null>`(select s.name from ${stores} s where s.owner_id = ${users}.id order by s.created_at limit 1)`,
        lastUsed: sql<Date>`max(${aiTurns}.created_at)`.mapWith((v) => new Date(v)),
        ...tokenSums,
      })
      .from(aiTurns)
      .innerJoin(users, eq(users.id, aiTurns.userId))
      .where(gte(aiTurns.createdAt, windowStart.month))
      .groupBy(aiTurns.userId, users.id)
      .orderBy(desc(sql`sum(${aiTurns}.output_tokens) * 5 + sum(${aiTurns}.input_tokens)`))
      .limit(25),
    db.select({ n: count() }).from(aiConversations),
  ]);

  return {
    today,
    week,
    month,
    allTime,
    daily: daily.map(withCost),
    topMerchants: topMerchants.map(withCost).sort((a, b) => b.costUsd - a.costUsd),
    conversations: conversations?.n ?? 0,
  };
}
