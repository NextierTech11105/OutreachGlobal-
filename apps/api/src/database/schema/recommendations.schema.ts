/**
 * RECOMMENDATIONS SCHEMA (Human Gate)
 * ====================================
 * AI recommends actions, humans confirm before execution.
 *
 * This table implements the doctrine principle:
 * "AI classifies + explains rather than executes"
 *
 * Flow:
 * 1. AI analyzes lead/event
 * 2. AI creates recommendation with reason
 * 3. Human reviews in inbox/dashboard
 * 4. Human approves, edits, or dismisses
 * 5. System executes approved actions
 */

import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teams, teamsRef } from "./teams.schema";
import { leads } from "./leads.schema";
import { leadSignals } from "./signals.schema";

// Primary key prefix
export const RECOMMENDATION_PK = "rec";

// Recommended action types
export type RecommendedAction =
  // Messaging actions
  | "SEND_SMS"
  | "SEND_EMAIL"
  | "SEND_VOICE_DROP"

  // Call actions
  | "QUEUE_FOR_CALL"
  | "SCHEDULE_CALL"

  // Workflow actions
  | "MOVE_TO_BUCKET"
  | "ESCALATE_TO_WORKER"
  | "ARCHIVE_LEAD"
  | "REACTIVATE_LEAD"

  // Booking actions
  | "SCHEDULE_APPOINTMENT"
  | "SEND_CALENDAR_INVITE"

  // Research actions
  | "ENRICH_WITH_APOLLO"
  | "RUN_SKIP_TRACE";

// Recommendation status
export type RecommendationStatus =
  | "pending" // Awaiting human review
  | "approved" // Human approved, awaiting execution
  | "executing" // Currently executing
  | "completed" // Successfully executed
  | "edited" // Human edited before approval
  | "dismissed" // Human dismissed (won't execute)
  | "expired" // Timed out without action
  | "failed"; // Execution failed

// AI worker that created the recommendation
export type RecommendingWorker =
  | "gianna"
  | "cathy"
  | "sabrina"
  | "neva"
  | "system";

/**
 * AI Recommendations Table
 *
 * Every action the AI wants to take must go through this table.
 * Humans can approve, edit, or dismiss recommendations.
 */
export const recommendations = pgTable(
  "recommendations",
  {
    id: primaryUlid(RECOMMENDATION_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn()
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),

    // The recommended action
    action: varchar().notNull().$type<RecommendedAction>(),

    // Status tracking
    status: varchar()
      .notNull()
      .$type<RecommendationStatus>()
      .default("pending"),

    // Priority for inbox ordering (0-100, higher = more urgent)
    priority: integer().notNull().default(50),

    // Which AI worker created this recommendation
    recommendedBy: varchar("recommended_by")
      .notNull()
      .$type<RecommendingWorker>(),

    // AI's reasoning (shown to human for context)
    aiReason: text("ai_reason").notNull(),

    // Confidence score (0-100)
    confidence: integer().notNull().default(80),

    // The content/payload of the action
    content: text(), // Message text, email body, etc.
    contentEdited: text("content_edited"), // Human's edited version

    // Action-specific metadata
    actionMetadata: jsonb("action_metadata").$type<{
      templateId?: string;
      targetBucket?: string;
      targetWorker?: string;
      scheduledTime?: string;
      callScript?: string;
      emailSubject?: string;
      [key: string]: unknown;
    }>(),

    // Link to triggering signal (for audit trail)
    triggerSignalId: ulidColumn("trigger_signal_id").references(
      () => leadSignals.id,
      { onDelete: "set null" }
    ),

    // Human review tracking
    reviewedBy: varchar("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    reviewNotes: text("review_notes"),

    // Execution tracking
    executedAt: timestamp("executed_at"),
    executionResult: jsonb("execution_result").$type<{
      success: boolean;
      messageSid?: string;
      error?: string;
      [key: string]: unknown;
    }>(),

    // Expiration (recommendations auto-expire if not acted on)
    expiresAt: timestamp("expires_at"),

    // Flags
    isUrgent: boolean("is_urgent").default(false),
    requiresReview: boolean("requires_review").default(true),

    createdAt,
    updatedAt,
  },
  (t) => [
    // Hot path: pending recommendations for a team
    index("recommendations_team_status_idx").on(t.teamId, t.status),

    // Inbox view: pending by priority
    index("recommendations_pending_priority_idx").on(
      t.teamId,
      t.status,
      t.priority
    ),

    // Lead view: all recommendations for a lead
    index("recommendations_lead_idx").on(t.leadId),

    // Worker view: recommendations by worker
    index("recommendations_worker_idx").on(t.recommendedBy),

    // Expiration cleanup
    index("recommendations_expires_idx").on(t.expiresAt),

    // Action type filtering
    index("recommendations_action_idx").on(t.action),
  ]
);

// Relations
export const recommendationsRelations = relations(
  recommendations,
  ({ one }) => ({
    team: one(teams, {
      fields: [recommendations.teamId],
      references: [teams.id],
    }),
    lead: one(leads, {
      fields: [recommendations.leadId],
      references: [leads.id],
    }),
    triggerSignal: one(leadSignals, {
      fields: [recommendations.triggerSignalId],
      references: [leadSignals.id],
    }),
  })
);

// Type exports
export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;
