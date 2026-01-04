/**
 * AUTO-TRIGGERS SCHEMA
 * ====================
 * Event-driven SMS automation triggers.
 * Fires automatically based on lead behavior and events.
 *
 * Supported triggers:
 * - lead_responded: When a lead replies
 * - no_response: After N days of no response
 * - stage_changed: When lead moves to specific stage
 * - meeting_booked: When a meeting is scheduled
 * - positive_sentiment: On positive response detection
 * - negative_sentiment: On negative/objection detection
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teams, teamsRef } from "./teams.schema";
import { leads } from "./leads.schema";

// Primary key prefix
export const AUTO_TRIGGER_PK = "trg";
export const TRIGGER_EXEC_PK = "tex";

// Trigger types
export type TriggerType =
  | "lead_responded"
  | "no_response"
  | "stage_changed"
  | "meeting_booked"
  | "positive_sentiment"
  | "negative_sentiment";

// Execution status
export type TriggerExecStatus = "pending" | "sent" | "failed";

/**
 * Auto-Triggers Table
 *
 * Configures event-driven SMS automation.
 */
export const autoTriggers = pgTable(
  "auto_triggers",
  {
    id: primaryUlid(AUTO_TRIGGER_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Trigger configuration
    name: varchar().notNull(),
    type: varchar().$type<TriggerType>().notNull(),
    enabled: boolean().notNull().default(true),

    // Template to send when triggered
    templateId: varchar("template_id").notNull(),
    templateName: varchar("template_name").notNull(),

    // Type-specific configuration (JSON)
    // e.g., { daysWithoutResponse: 5 } for no_response
    // e.g., { targetStage: "qualified" } for stage_changed
    // e.g., { minConfidence: 80 } for sentiment triggers
    config: jsonb().notNull().default({}),

    // Stats
    firedCount: integer("fired_count").notNull().default(0),
    lastFiredAt: timestamp("last_fired_at"),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("auto_triggers_team_idx").on(t.teamId),
    index("auto_triggers_type_idx").on(t.type),
    index("auto_triggers_enabled_idx").on(t.teamId, t.enabled),
  ],
);

/**
 * Trigger Executions Table
 *
 * Records each time a trigger fires.
 */
export const triggerExecutions = pgTable(
  "trigger_executions",
  {
    id: primaryUlid(TRIGGER_EXEC_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    triggerId: ulidColumn("trigger_id")
      .references(() => autoTriggers.id, { onDelete: "cascade" })
      .notNull(),
    leadId: ulidColumn("lead_id")
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),

    // Execution details
    status: varchar().$type<TriggerExecStatus>().notNull().default("pending"),
    sentAt: timestamp("sent_at"),
    failedAt: timestamp("failed_at"),
    failedReason: varchar("failed_reason"),

    // Event context that triggered this
    eventType: varchar("event_type"),
    eventData: jsonb("event_data"),

    createdAt,
  },
  (t) => [
    index("trigger_exec_team_idx").on(t.teamId),
    index("trigger_exec_trigger_idx").on(t.triggerId),
    index("trigger_exec_lead_idx").on(t.leadId),
    index("trigger_exec_status_idx").on(t.status),
    index("trigger_exec_created_idx").on(t.createdAt),
  ],
);

// Relations
export const autoTriggersRelations = relations(
  autoTriggers,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [autoTriggers.teamId],
      references: [teams.id],
    }),
    executions: many(triggerExecutions),
  }),
);

export const triggerExecutionsRelations = relations(
  triggerExecutions,
  ({ one }) => ({
    team: one(teams, {
      fields: [triggerExecutions.teamId],
      references: [teams.id],
    }),
    trigger: one(autoTriggers, {
      fields: [triggerExecutions.triggerId],
      references: [autoTriggers.id],
    }),
    lead: one(leads, {
      fields: [triggerExecutions.leadId],
      references: [leads.id],
    }),
  }),
);

// Type exports
export type AutoTrigger = typeof autoTriggers.$inferSelect;
export type NewAutoTrigger = typeof autoTriggers.$inferInsert;
export type TriggerExecution = typeof triggerExecutions.$inferSelect;
export type NewTriggerExecution = typeof triggerExecutions.$inferInsert;
