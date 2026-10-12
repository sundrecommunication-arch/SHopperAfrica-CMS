import { NextResponse } from "next/server";
import { z } from "zod";

import { NotSignedInError } from "@/lib/current-user";
import { getAssistantContext } from "@/modules/assistant/context";
import {
  AssistantLimitError,
  dailyTurnLimit,
  getLatestConversation,
  isAssistantEnabled,
  runAssistantTurn,
  toDisplay,
  turnsUsedToday,
  type AssistantEvent,
} from "@/modules/assistant/agent";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().max(100).nullish(),
  newConversation: z.boolean().optional(),
});

/** The latest conversation, ready to display, plus today's usage. */
export async function GET() {
  try {
    const ctx = await getAssistantContext();
    const [conversation, used] = await Promise.all([
      getLatestConversation(ctx.userId, ctx.store?.id ?? null),
      turnsUsedToday(ctx.userId),
    ]);
    return NextResponse.json({
      enabled: isAssistantEnabled(),
      conversationId: conversation?.id ?? null,
      items: conversation ? toDisplay(conversation.messages) : [],
      store: ctx.store ? { name: ctx.store.name, slug: ctx.store.slug } : null,
      remainingToday: Math.max(0, dailyTurnLimit() - used),
    });
  } catch (error) {
    if (error instanceof NotSignedInError) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    throw error;
  }
}

/** Sends a message; the reply streams back as newline-delimited JSON events. */
export async function POST(request: Request) {
  if (!isAssistantEnabled()) {
    return NextResponse.json({ error: "The AI assistant is coming soon." }, { status: 503 });
  }
  let ctx;
  try {
    ctx = await getAssistantContext();
  } catch (error) {
    if (error instanceof NotSignedInError) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    throw error;
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type a message first." }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const emit = (event: AssistantEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          open = false; // the browser went away; keep going so the history is saved
        }
      };
      try {
        await runAssistantTurn({
          ctx,
          userText: parsed.data.message,
          conversationId: parsed.data.conversationId,
          newConversation: parsed.data.newConversation,
          emit,
          signal: request.signal,
        });
      } catch (error) {
        if (error instanceof AssistantLimitError) {
          emit({ type: "error", message: error.message });
        } else if (!request.signal.aborted) {
          console.error("assistant turn failed", error);
          emit({ type: "error", message: "Sorry, something went wrong. Please try again in a moment." });
        }
      } finally {
        if (open) {
          open = false;
          try {
            controller.close();
          } catch {}
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" },
  });
}
