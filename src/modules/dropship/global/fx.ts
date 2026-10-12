import "server-only";

// USD -> NGN for pricing worldwide products. USD_NGN_RATE pins a rate (what
// you actually pay to fund the CJ wallet); otherwise a live market rate is
// fetched (cached 6h). DROPSHIP_FX_BUFFER_PERCENT (default 8) is added on
// top so naira prices survive rate moves and card FX fees.

let cache: { at: number; rate: number } | null = null;

async function marketRate(): Promise<number> {
  if (cache && Date.now() - cache.at < 6 * 60 * 60 * 1000) return cache.rate;
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  const data = await res.json().catch(() => null);
  const rate = Number(data?.rates?.NGN);
  if (!res.ok || !Number.isFinite(rate) || rate < 100) throw new Error("Couldn't get the dollar rate. Set USD_NGN_RATE.");
  cache = { at: Date.now(), rate };
  return rate;
}

export async function usdToNgnRate(): Promise<{ rate: number; source: "fixed" | "market"; buffered: number }> {
  const fixed = Number(process.env.USD_NGN_RATE);
  const rate = Number.isFinite(fixed) && fixed > 0 ? fixed : await marketRate();
  const buffer = Number(process.env.DROPSHIP_FX_BUFFER_PERCENT ?? 8);
  const buffered = rate * (1 + (Number.isFinite(buffer) && buffer >= 0 ? buffer : 8) / 100);
  return { rate, source: Number.isFinite(fixed) && fixed > 0 ? "fixed" : "market", buffered };
}

/** Naira price for a USD cost, rounded up to the next ₦100. */
export async function nairaFromUsd(usd: number) {
  const { buffered } = await usdToNgnRate();
  return Math.ceil((usd * buffered) / 100) * 100;
}
