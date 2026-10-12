import { getAiUsageReport, AI_RATES_USD_PER_MTOK } from "@/modules/assistant/usage";
import { assistantStatus, dailyTurnLimit } from "@/modules/assistant/agent";
import { usdToNgnRate } from "@/modules/dropship/global/fx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "AI usage · Shopper Admin" };

const usd = (n: number) => `$${n < 10 ? n.toFixed(2) : Math.round(n).toLocaleString()}`;
const tokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

export default async function AdminAiUsagePage() {
  const [report, fx] = await Promise.all([getAiUsageReport(), usdToNgnRate().catch(() => null)]);
  const status = assistantStatus();
  const naira = (n: number) => (fx ? `≈ ₦${Math.round(n * fx.rate).toLocaleString()}` : undefined);
  const perMessage = report.month.messages ? report.month.costUsd / report.month.messages : 0;

  const windows = [
    { label: "Today", w: report.today },
    { label: "Last 7 days", w: report.week },
    { label: "Last 30 days", w: report.month },
    { label: "All time", w: report.allTime },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
          AI assistant usage
          {status.state === "on" && <Badge variant="outline">On</Badge>}
          {status.state === "no_key" && <Badge variant="secondary">Off: no ANTHROPIC_API_KEY</Badge>}
          {status.state === "paused" && <Badge variant="destructive">Paused: out of credit or key problem</Badge>}
        </h1>
        <p className="text-sm text-muted-foreground">
          {status.state === "paused"
            ? `Anthropic refused requests, so merchants see "coming soon". It retries automatically after ${status.until.toLocaleTimeString("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })} (Lagos). Top up at platform.claude.com/settings/billing.`
            : `Each merchant can send ${dailyTurnLimit()} messages a day (AI_ASSISTANT_DAILY_LIMIT).`}{" "}
          Costs are estimates from token counts at Claude Opus 5.5 list prices; your Anthropic bill is the final figure.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {windows.map(({ label, w }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{usd(w.costUsd)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[naira(w.costUsd), `${w.messages.toLocaleString()} messages`, `${w.merchants} merchant${w.merchants === 1 ? "" : "s"}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Last 30 days: {usd(perMessage)} per message on average · {report.month.actions.toLocaleString()} store changes made by the assistant ·{" "}
        {tokens(report.month.cacheRead)} tokens served from cache · {report.conversations.toLocaleString()} conversation{report.conversations === 1 ? "" : "s"} in total.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top merchants (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {report.topMerchants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one has used the assistant in the last 30 days.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Merchant</th>
                  <th className="py-2 pr-4 font-medium">Store</th>
                  <th className="py-2 pr-4 text-right font-medium">Messages</th>
                  <th className="py-2 pr-4 text-right font-medium">Changes</th>
                  <th className="py-2 pr-4 text-right font-medium">Est. cost</th>
                  <th className="py-2 text-right font-medium">Last used</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.topMerchants.map((m) => (
                  <tr key={m.userId}>
                    <td className="py-2 pr-4">
                      <span className="font-medium">{m.name ?? m.email}</span>
                      {m.name && <span className="block text-xs text-muted-foreground">{m.email}</span>}
                    </td>
                    <td className="py-2 pr-4">{m.store ?? <span className="text-muted-foreground">no store yet</span>}</td>
                    <td className="py-2 pr-4 text-right">{m.messages}</td>
                    <td className="py-2 pr-4 text-right">{m.actions}</td>
                    <td className="py-2 pr-4 text-right">{usd(m.costUsd)}</td>
                    <td className="py-2 text-right text-muted-foreground">{m.lastUsed.toLocaleDateString("en-GB", { timeZone: "Africa/Lagos" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By day (last 30 days, Lagos time)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {report.daily.length === 0 ? (
            <p className="text-sm text-muted-foreground">No usage yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Day</th>
                  <th className="py-2 pr-4 text-right font-medium">Messages</th>
                  <th className="py-2 pr-4 text-right font-medium">Merchants</th>
                  <th className="py-2 pr-4 text-right font-medium">Input</th>
                  <th className="py-2 pr-4 text-right font-medium">From cache</th>
                  <th className="py-2 pr-4 text-right font-medium">Output</th>
                  <th className="py-2 text-right font-medium">Est. cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.daily.map((d) => (
                  <tr key={d.day}>
                    <td className="py-2 pr-4 font-medium">{new Date(`${d.day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</td>
                    <td className="py-2 pr-4 text-right">{d.messages}</td>
                    <td className="py-2 pr-4 text-right">{d.merchants}</td>
                    <td className="py-2 pr-4 text-right">{tokens(d.input + d.cacheWrite)}</td>
                    <td className="py-2 pr-4 text-right">{tokens(d.cacheRead)}</td>
                    <td className="py-2 pr-4 text-right">{tokens(d.output)}</td>
                    <td className="py-2 text-right">{usd(d.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Rates used (USD per million tokens): input ${AI_RATES_USD_PER_MTOK.input}, output ${AI_RATES_USD_PER_MTOK.output}, cached input $
        {AI_RATES_USD_PER_MTOK.cacheRead}, cache writes ${AI_RATES_USD_PER_MTOK.cacheWrite}.
        {fx && ` Naira at ₦${Math.round(fx.rate).toLocaleString()}/$ (${fx.source === "fixed" ? "USD_NGN_RATE" : "market rate"}).`}
      </p>
    </div>
  );
}
