import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { and, count, desc, eq, gte, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { aiConversations, aiTurns } from "@/db/schema";
import { ASSISTANT_SYSTEM_PROMPT } from "./system-prompt";
import { assistantToolDefinitions, findAssistantTool, isKnownToolError, type AssistantContext } from "./tools";

// The AI setup assistant's agent loop: a manual streaming tool-use loop over
// the tools in ./tools. One call = one merchant message; events are emitted
// for the chat UI as they happen.

type MessageParam = Anthropic.Beta.BetaMessageParam;

const MODEL = "claude-opus-5-5";
const MAX_TOKENS = 16000;
/** Model calls per merchant message before we pause and ask them to continue. */
const MAX_STEPS = 12;
/** Past this many stored messages a fresh conversation starts (store facts come back via get_store_overview). */
const MAX_HISTORY = 160;

export type AssistantEvent =
  | { type: "conversation"; id: string }
  | { type: "step" } // a new model call starts
  | { type: "text"; text: string }
  | { type: "discard" } // drop text streamed since the last "step" (retried or refused)
  | { type: "tool"; id: string; label: string; status: "running" | "done" | "error" }
  | { type: "store"; name: string; slug: string }
  | { type: "done" }
  | { type: "error"; message: string };

export class AssistantLimitError extends Error {}

export const isAssistantEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

export function dailyTurnLimit() {
  const n = Number(process.env.AI_ASSISTANT_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 40;
}

export async function turnsUsedToday(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ n: count() })
    .from(aiTurns)
    .where(and(eq(aiTurns.userId, userId), gte(aiTurns.createdAt, since)));
  return row?.n ?? 0;
}

/** The user's latest conversation for this store (or from before they had one). */
export async function getLatestConversation(userId: string, storeId: string | null) {
  const [row] = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        storeId ? or(eq(aiConversations.storeId, storeId), isNull(aiConversations.storeId)) : isNull(aiConversations.storeId)
      )
    )
    .orderBy(desc(aiConversations.updatedAt))
    .limit(1);
  return row ?? null;
}

async function startConversation(userId: string, storeId: string | null) {
  const [row] = await db.insert(aiConversations).values({ userId, storeId, messages: [] }).returning();
  return row;
}

// --- History -> chat display ---------------------------------------------------------

export type DisplayItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool"; label: string; ok: boolean };

/** Turns the stored Claude history into what the chat shows (no tool results, no thinking). */
export function toDisplay(messages: unknown[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  const failed = new Set<string>();
  for (const m of messages as MessageParam[]) {
    if (m.role === "user" && Array.isArray(m.content)) {
      for (const b of m.content) if (b.type === "tool_result" && b.is_error) failed.add(b.tool_use_id);
    }
  }
  for (const m of messages as MessageParam[]) {
    const blocks = typeof m.content === "string" ? [{ type: "text" as const, text: m.content }] : m.content;
    for (const b of blocks) {
      if (b.type === "text" && b.text.trim()) {
        items.push({ kind: m.role === "user" ? "user" : "assistant", text: b.text });
      } else if (b.type === "tool_use") {
        // Calls with invalid input never ran (and showed no chip live), so skip them.
        const tool = findAssistantTool(b.name);
        const parsed = tool?.schema.safeParse(b.input);
        if (tool && parsed?.success) items.push({ kind: "tool", label: tool.label(parsed.data), ok: !failed.has(b.id) });
      }
    }
  }
  return items;
}

// --- The loop -------------------------------------------------------------------------

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

// One turn at a time per user (a double-tap would otherwise interleave two
// turns into the same history). Per-process: good enough for a single instance.
const busy = new Set<string>();

interface RunOptions {
  ctx: AssistantContext;
  userText: string;
  conversationId?: string | null;
  newConversation?: boolean;
  emit: (event: AssistantEvent) => void;
  signal?: AbortSignal;
}

export async function runAssistantTurn({ ctx, userText, conversationId, newConversation, emit, signal }: RunOptions) {
  if (busy.has(ctx.userId)) throw new AssistantLimitError("I'm still working on your last message.");
  const limit = dailyTurnLimit();
  if ((await turnsUsedToday(ctx.userId)) >= limit) {
    throw new AssistantLimitError(`You've reached today's limit of ${limit} messages. Please come back tomorrow.`);
  }
  busy.add(ctx.userId);
  try {
    await runTurn({ ctx, userText, conversationId, newConversation, emit, signal });
  } finally {
    busy.delete(ctx.userId);
  }
}

async function runTurn({ ctx, userText, conversationId, newConversation, emit, signal }: RunOptions) {
  const storeId = ctx.store?.id ?? null;
  let conversation = newConversation
    ? null
    : conversationId
      ? ((
          await db
            .select()
            .from(aiConversations)
            .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, ctx.userId)))
            .limit(1)
        )[0] ?? null)
      : await getLatestConversation(ctx.userId, storeId);
  if (!conversation || conversation.messages.length > MAX_HISTORY) {
    conversation = await startConversation(ctx.userId, storeId);
  }
  emit({ type: "conversation", id: conversation.id });

  const messages = [...(conversation.messages as MessageParam[])];
  // A previous turn can end on a user message (tool results after the step
  // cap, or a refused reply that wasn't kept). Merge into it so roles alternate.
  const last = messages.at(-1);
  if (last?.role === "user") {
    const content = typeof last.content === "string" ? [{ type: "text" as const, text: last.content }] : last.content;
    messages[messages.length - 1] = { role: "user", content: [...content, { type: "text", text: userText }] };
  } else {
    messages.push({ role: "user", content: userText });
  }

  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, tools: 0 };
  const conversationRowId = conversation.id;
  const save = () =>
    db
      .update(aiConversations)
      .set({ messages, storeId: ctx.store?.id ?? null, updatedAt: new Date() })
      .where(eq(aiConversations.id, conversationRowId));

  await save();
  try {
    let jsonRetries = 0;
    let finished = false;
    for (let step = 0; step < MAX_STEPS && !finished; step++) {
      emit({ type: "step" });
      const stream = getClient().beta.messages.stream(
        {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: ASSISTANT_SYSTEM_PROMPT,
          tools: assistantToolDefinitions,
          messages,
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          cache_control: { type: "ephemeral" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        },
        { signal }
      );
      stream.on("text", (text) => emit({ type: "text", text }));

      let message: Anthropic.Beta.BetaMessage;
      try {
        message = await stream.finalMessage();
        jsonRetries = 0;
      } catch (err) {
        // With eager input streaming a tool input that isn't parseable JSON
        // rejects here. Only that is retried; API errors and aborts are not.
        if (err instanceof Anthropic.APIError || signal?.aborted || jsonRetries++ >= 2) throw err;
        emit({ type: "discard" });
        step--;
        continue;
      }

      usage.input += message.usage.input_tokens;
      usage.output += message.usage.output_tokens;
      usage.cacheRead += message.usage.cache_read_input_tokens ?? 0;
      usage.cacheWrite += message.usage.cache_creation_input_tokens ?? 0;

      if (message.stop_reason === "refusal") {
        // Even the fallback model declined. A refusal can cut output off
        // mid-way, so the partial reply is dropped rather than kept.
        emit({ type: "discard" });
        emit({ type: "text", text: "Sorry, I can't help with that one. Is there something else about your store I can do?" });
        finished = true;
        break;
      }

      const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (message.stop_reason === "pause_turn" || toolUses.length === 0) {
        messages.push({ role: "assistant", content: message.content });
        if (message.stop_reason === "pause_turn") continue;
        finished = true;
        break;
      }

      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const use of toolUses) {
        usage.tools++;
        results.push(await runTool(use, ctx, emit, message.stop_reason === "max_tokens"));
      }
      // The assistant turn and its tool results go in together, so the saved
      // history never ends on an unanswered tool call.
      messages.push({ role: "assistant", content: message.content }, { role: "user", content: results });
      await save();
    }

    if (!finished && messages.at(-1)?.role === "user") {
      emit({ type: "step" });
      emit({ type: "text", text: "\n\nI've done a lot in one go. Reply **continue** and I'll carry on." });
    }
    emit({ type: "done" });
  } finally {
    // Only complete steps are in `messages`, so what's saved is always a valid history.
    await save();
    await db.insert(aiTurns).values({
      userId: ctx.userId,
      conversationId: conversationRowId,
      inputTokens: usage.input,
      outputTokens: usage.output,
      cacheReadTokens: usage.cacheRead,
      cacheWriteTokens: usage.cacheWrite,
      toolCalls: usage.tools,
    });
  }
}

async function runTool(
  use: Anthropic.Beta.BetaToolUseBlock,
  ctx: AssistantContext,
  emit: (event: AssistantEvent) => void,
  truncated: boolean
): Promise<Anthropic.Beta.BetaToolResultBlockParam> {
  const error = (content: string): Anthropic.Beta.BetaToolResultBlockParam => ({
    type: "tool_result",
    tool_use_id: use.id,
    is_error: true,
    content,
  });
  const tool = findAssistantTool(use.name);
  if (!tool) return error(`Unknown tool: ${use.name}`);
  // The reply hit max_tokens: the input is likely cut off even if it parses.
  if (truncated) return error("Your tool input was cut off (too long). Retry with fewer items per call.");
  // Streamed tool inputs aren't validated by the API; never run unchecked input.
  const parsed = tool.schema.safeParse(use.input);
  if (!parsed.success) {
    return error(
      JSON.stringify({
        INVALID_JSON: JSON.stringify(use.input),
        problems: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "input"}: ${i.message}`),
      })
    );
  }

  const label = tool.label(parsed.data);
  emit({ type: "tool", id: use.id, label, status: "running" });
  const hadStore = Boolean(ctx.store);
  try {
    const result = await tool.run(parsed.data, ctx);
    emit({ type: "tool", id: use.id, label, status: "done" });
    if (!hadStore && ctx.store) emit({ type: "store", name: ctx.store.name, slug: ctx.store.slug });
    return { type: "tool_result", tool_use_id: use.id, content: JSON.stringify(result ?? { ok: true }) };
  } catch (e) {
    emit({ type: "tool", id: use.id, label, status: "error" });
    if (isKnownToolError(e)) return error(e.message);
    console.error(`assistant tool ${use.name} failed`, e);
    return error("Something went wrong on Shopper's side while doing this. Tell the merchant and suggest doing it from the dashboard.");
  }
}
