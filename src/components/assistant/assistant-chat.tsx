"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowUp, Check, Loader2, Plus, Sparkles, Square, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Chat with Shopper's AI setup assistant (src/modules/assistant). Replies
// stream in from POST /api/assistant as newline-delimited JSON events.

type Item =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool"; id?: string; label: string; status: "running" | "done" | "error" };

type ServerEvent =
  | { type: "conversation"; id: string }
  | { type: "step" }
  | { type: "text"; text: string }
  | { type: "discard" }
  | { type: "tool"; id: string; label: string; status: "running" | "done" | "error" }
  | { type: "store"; name: string; slug: string }
  | { type: "done" }
  | { type: "unavailable"; message: string }
  | { type: "error"; message: string };

interface Loaded {
  enabled: boolean;
  conversationId: string | null;
  items: Array<{ kind: "user" | "assistant"; text: string } | { kind: "tool"; label: string; ok: boolean }>;
  store: { name: string; slug: string } | null;
  remainingToday: number;
}

const STARTERS_NEW = [
  "I sell women's clothes in Lagos. Help me set up my store.",
  "I bake cakes and small chops. Set up a store for me.",
  "I want to sell phones and accessories online.",
];
const STARTERS_EXISTING = [
  "What's left to set up before I can start selling?",
  "Help me add my products.",
  "Set up delivery fees and payment methods.",
];

export function AssistantChat({ variant }: { variant: "onboarding" | "dashboard" }) {
  const { update } = useSession();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<{ name: string; slug: string } | null>(null);
  const [createdStore, setCreatedStore] = useState(false);
  const conversationId = useRef<string | null>(null);
  const startFresh = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/assistant")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Loaded) => {
        setLoaded(data);
        setStore(data.store);
        conversationId.current = data.conversationId;
        setItems(
          data.items.map((i) => (i.kind === "tool" ? { kind: "tool", label: i.label, status: i.ok ? "done" : "error" } : i))
        );
      })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [items, sending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setError(null);
    setInput("");
    setSending(true);
    setItems((prev) => [...prev, { kind: "user", text: message }]);

    // Where the current model step's text starts, so a "discard" can undo it.
    let stepMark: { index: number; length: number } | null = null;
    const controller = new AbortController();
    abort.current = controller;

    const apply = (event: ServerEvent) => {
      switch (event.type) {
        case "conversation":
          conversationId.current = event.id;
          startFresh.current = false;
          break;
        case "step":
          setItems((prev) => {
            const last = prev.at(-1);
            stepMark =
              last?.kind === "assistant" ? { index: prev.length - 1, length: last.text.length } : { index: prev.length, length: 0 };
            return prev;
          });
          break;
        case "text":
          setItems((prev) => {
            const last = prev.at(-1);
            if (last?.kind === "assistant") return [...prev.slice(0, -1), { ...last, text: last.text + event.text }];
            return [...prev, { kind: "assistant", text: event.text.replace(/^\s+/, "") }];
          });
          break;
        case "discard":
          setItems((prev) => {
            if (!stepMark) return prev;
            const mark = stepMark;
            const kept = prev.slice(0, mark.index + 1);
            const at = kept[mark.index];
            if (at?.kind !== "assistant") return prev.slice(0, mark.index);
            return mark.length ? [...kept.slice(0, -1), { ...at, text: at.text.slice(0, mark.length) }] : kept.slice(0, -1);
          });
          break;
        case "tool":
          setItems((prev) => {
            const i = prev.findIndex((it) => it.kind === "tool" && it.id === event.id);
            const item: Item = { kind: "tool", id: event.id, label: event.label, status: event.status };
            return i === -1 ? [...prev, item] : prev.map((it, j) => (j === i ? item : it));
          });
          break;
        case "store":
          setStore({ name: event.name, slug: event.slug });
          setCreatedStore(true);
          void update(); // pick up the new store membership in the session
          break;
        case "error":
          setError(event.message);
          break;
        case "unavailable":
          setLoaded((l) => (l ? { ...l, enabled: false } : l));
          break;
      }
    };

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId: conversationId.current, newConversation: startFresh.current }),
        signal: controller.signal,
      });
      if (res.status === 503) {
        setLoaded((l) => (l ? { ...l, enabled: false } : l));
        return;
      }
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Sorry, something went wrong. Please try again.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            apply(JSON.parse(line) as ServerEvent);
          } catch {
            // ignore a malformed line
          }
        }
      }
      setLoaded((l) => (l ? { ...l, remainingToday: Math.max(0, l.remainingToday - 1) } : l));
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError("Connection lost. Please try again.");
      }
    } finally {
      setSending(false);
      abort.current = null;
      // Anything still "running" when the stream ends didn't finish.
      setItems((prev) => prev.map((it) => (it.kind === "tool" && it.status === "running" ? { ...it, status: "error" } : it)));
      textarea.current?.focus();
    }
  }

  function newChat() {
    if (sending) return;
    setItems([]);
    setError(null);
    startFresh.current = true;
    textarea.current?.focus();
  }

  if (loadError) {
    return <p className="text-muted-foreground p-6 text-center text-sm">Couldn&apos;t load the assistant. Please refresh the page.</p>;
  }
  if (!loaded) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-6">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  if (!loaded.enabled) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <Sparkles className="text-primary size-8" />
        <h2 className="font-semibold">AI assistant coming soon</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Soon you&apos;ll be able to set up your whole store just by chatting.{" "}
          {variant === "onboarding" ? "For now, create your store with the quick form." : "For now, use the menu to set things up."}
        </p>
        {variant === "onboarding" && (
          <Button asChild variant="outline">
            <Link href="/onboarding">Use the quick form</Link>
          </Button>
        )}
      </div>
    );
  }

  const starters = store ? STARTERS_EXISTING : STARTERS_NEW;
  const outOfMessages = loaded.remainingToday <= 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="text-primary size-4 shrink-0" />
          <span className="truncate text-sm font-medium">AI assistant</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {store && variant === "onboarding" && (
            <Button asChild size="sm" variant={createdStore ? "default" : "ghost"}>
              <a href="/dashboard">Go to dashboard</a>
            </Button>
          )}
          {items.length > 0 && (
            <Button size="sm" variant="ghost" onClick={newChat} disabled={sending}>
              <Plus className="size-4" />
              New chat
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {items.length === 0 && (
            <div className="flex flex-col gap-4 py-6">
              <Bubble role="assistant">
                {store
                  ? `Hi! I can finish setting up ${store.name} for you: products, delivery fees, payments, policies and more. Just tell me what you need.`
                  : "Hi! I'll set up your online store with you. Tell me what you sell and what you'd like to call your store, and I'll do the rest."}
              </Bubble>
              <div className="flex flex-wrap gap-2">
                {starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={outOfMessages}
                    className="hover:bg-muted rounded-full border px-3 py-1.5 text-left text-xs disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {items.map((item, i) =>
            item.kind === "tool" ? (
              <ToolChip key={item.id ?? `t${i}`} label={item.label} status={item.status} />
            ) : (
              <Bubble key={i} role={item.kind}>
                {item.kind === "assistant" ? <RichText text={item.text} /> : item.text}
              </Bubble>
            )
          )}

          {sending && items.at(-1)?.kind === "user" && (
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Loader2 className="size-3.5 animate-spin" /> Thinking…
            </div>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          {createdStore && variant === "onboarding" && !sending && (
            <p className="text-muted-foreground text-xs">
              Your store is created. You can keep chatting here, or{" "}
              <a href="/dashboard" className="text-primary underline underline-offset-2">
                open your dashboard
              </a>{" "}
              and continue with the assistant there.
            </p>
          )}
          <div ref={bottom} />
        </div>
      </div>

      <form
        className="border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            ref={textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder={outOfMessages ? "You've used today's messages. Come back tomorrow." : "Type your message…"}
            disabled={outOfMessages}
            className="border-input placeholder:text-muted-foreground focus-visible:ring-ring max-h-40 min-h-10 flex-1 resize-none rounded-2xl border bg-transparent px-4 py-2.5 text-base outline-none field-sizing-content focus-visible:ring-2 md:text-sm"
          />
          {sending ? (
            <Button type="button" size="icon" variant="outline" className="size-10 rounded-full" onClick={() => abort.current?.abort()} aria-label="Stop">
              <Square className="size-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" className="size-10 rounded-full" disabled={!input.trim() || outOfMessages} aria-label="Send">
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
        {loaded.remainingToday <= 10 && !outOfMessages && (
          <p className="text-muted-foreground mx-auto mt-1 max-w-2xl text-[11px]">{loaded.remainingToday} messages left today</p>
        )}
      </form>
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words",
        role === "user" ? "bg-primary text-primary-foreground self-end whitespace-pre-wrap" : "bg-muted self-start"
      )}
    >
      {children}
    </div>
  );
}

function ToolChip({ label, status }: { label: string; status: "running" | "done" | "error" }) {
  return (
    <div className="text-muted-foreground flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-xs">
      {status === "running" && <Loader2 className="size-3 animate-spin" />}
      {status === "done" && <Check className="size-3 text-emerald-600" />}
      {status === "error" && <X className="text-destructive size-3" />}
      {label}
    </div>
  );
}

// Minimal, safe formatting for replies: paragraphs, "-" lists, **bold**, and
// Shopper paths (/dashboard/..., /store/...) as links. No HTML is rendered.
function RichText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          const ordered = /^\s*\d+\./.test(lines[0]);
          const List = ordered ? "ol" : "ul";
          return (
            <List key={i} className={cn("flex flex-col gap-0.5 pl-5", ordered ? "list-decimal" : "list-disc")}>
              {lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l.replace(/^\s*([-*•]|\d+\.)\s+/, "")} />
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Inline text={l} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

const INLINE = /(\*\*[^*]+\*\*|(?<![\w/])\/(?:dashboard|store|onboarding)(?:\/[\w\-./?=&]*)?)/g;

function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(INLINE).map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (/^\/(dashboard|store|onboarding)/.test(part)) {
          const href = part.replace(/[.,!?)]+$/, "");
          const tail = part.slice(href.length);
          return (
            <Fragment key={i}>
              <Link
                href={href}
                target={href.startsWith("/store/") ? "_blank" : undefined}
                className="text-primary font-medium underline underline-offset-2"
              >
                {href}
              </Link>
              {tail}
            </Fragment>
          );
        }
        return <Fragment key={i}>{part.replace(/\*\*/g, "")}</Fragment>;
      })}
    </>
  );
}
