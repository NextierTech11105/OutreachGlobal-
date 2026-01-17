import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  real,
} from "drizzle-orm/pg-core";
import { primaryUlid } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

/**
 * AI Prompts
 * Toggleable AI prompts with versioning.
 * Prompts can be enabled/disabled per team without code changes.
 */
export const aiPrompts = pgTable("ai_prompts", {
  id: primaryUlid("aip"),
  teamId: teamsRef({ onDelete: "cascade" }).notNull(),

  // Prompt identification
  promptKey: varchar({ length: 50 }).notNull(), // classify_intent, generate_response, etc
  version: integer().notNull().default(1),

  // Prompt content
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  systemPrompt: text().notNull(),
  userPromptTemplate: text(), // Can contain {variables}

  // Model configuration
  model: varchar({ length: 50 }).notNull().default("gpt-4o-mini"),
  temperature: real().notNull().default(0.7),
  maxTokens: integer(),

  // Controls
  isActive: boolean().notNull().default(true),
  isDefault: boolean().notNull().default(false), // System default

  // Metadata
  usageCount: integer().notNull().default(0),
  avgLatencyMs: integer(),
  successRate: real(),

  createdAt,
  updatedAt,
});

export type AiPrompt = typeof aiPrompts.$inferSelect;
export type NewAiPrompt = typeof aiPrompts.$inferInsert;
