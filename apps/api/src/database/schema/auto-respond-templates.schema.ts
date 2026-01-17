import {
  pgTable,
  varchar,
  text,
  jsonb,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { primaryUlid } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

/**
 * Auto-Respond Templates
 * Toggleable SMS response templates per agent and team.
 * Templates can be enabled/disabled without code changes.
 */
export const autoRespondTemplates = pgTable("auto_respond_templates", {
  id: primaryUlid("art"),
  teamId: teamsRef({ onDelete: "cascade" }).notNull(),

  // Agent and category
  agentType: varchar({ length: 20 }).notNull(), // GIANNA, CATHY, SABRINA
  category: varchar({ length: 50 }).notNull(), // opener, followUp, objection, booking, nudge

  // Template content
  name: varchar({ length: 255 }).notNull(),
  template: text().notNull(),
  variables: jsonb().$type<Array<{ name: string; required: boolean; default?: string }>>(),

  // Controls
  isActive: boolean().notNull().default(true),
  priority: integer().notNull().default(0), // Higher = selected first

  // Metadata
  usageCount: integer().notNull().default(0),
  lastUsedAt: timestamp(),

  createdAt,
  updatedAt,
});

export type AutoRespondTemplate = typeof autoRespondTemplates.$inferSelect;
export type NewAutoRespondTemplate = typeof autoRespondTemplates.$inferInsert;
