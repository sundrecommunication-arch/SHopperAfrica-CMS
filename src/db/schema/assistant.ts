import { pgTable, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { stores } from "./tenant";

// AI setup assistant (src/modules/assistant). One conversation per chat;
// `messages` is the exact Claude message history, append-only (assistant
// turns are stored unchanged, thinking blocks included -- required to
// continue the conversation correctly).
export const aiConversations = pgTable("ai_conversations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // The store being set up (null until the assistant creates one).
  storeId: text("store_id").references(() => stores.id, { onDelete: "set null" }),
  messages: jsonb("messages").$type<unknown[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

// One row per merchant message: daily limits and cost tracking.
export const aiTurns = pgTable("ai_turns", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id").references(() => aiConversations.id, { onDelete: "set null" }),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
  cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
  toolCalls: integer("tool_calls").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();
