/**
 * NEXTIER OPERATIONS SCHEMA
 * =========================
 * Tables for operational durability - replaces Redis-only storage
 * with Postgres source of truth + Redis cache pattern.
 *
 * These tables ensure data survives system restarts and Redis failures.
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teams } from "./teams.schema";
import { leads } from "./leads.schema";

// Primary key prefixes
export const CALL_QUEUE_PK = "cq";
export const CONVERSATION_CONTEXT_PK = "cctx";
export const EVENT_LOG_PK = "evtl";

// ============================================
// CALL QUEUE - Replace Redis call:queue
// Persists call queue items for durability
// ============================================

export type CallQueueStatus =
  | "pending"
  | "ringing"
  | "connected"
  | "completed"
  | "missed"
  | "failed"
  | "cancelled";

export const callQueue = pgTable(
  "call_queue",
  {
    id: primaryUlid(CALL_QUEUE_PK),
    teamId: ulidColumn()
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),

    // Call details
    phoneFrom: varchar("phone_from").notNull(),
    phoneTo: varchar("phone_to").notNull(),
    callSid: varchar("call_sid"),

    // Status tracking
    status: varchar().$type<CallQueueStatus>().notNull().default("pending"),
    statusReason: text("status_reason"),

    // Priority and scheduling
    priority: integer().notNull().default(50),
    scheduledAt: timestamp("scheduled_at"),

    // Assignment
    assignedWorker: varchar("assigned_worker"), // gianna, sabrina, cathy
    campaignId: ulidColumn("campaign_id"),
    leadId: ulidColumn("lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),

    // Attempt tracking
    attempts: integer().notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastAttemptAt: timestamp("last_attempt_at"),

    // Timing
    queuedAt: timestamp("queued_at").defaultNow(),
    answeredAt: timestamp("answered_at"),
    completedAt: timestamp("completed_at"),

    // Call outcome
    duration: integer(), // seconds
    recordingUrl: varchar("recording_url"),
    voicemailLeft: boolean("voicemail_left").default(false),

    // Metadata for additional context
    metadata: jsonb().$type<{
      lane?: string;
      persona?: string;
      notes?: string;
      [key: string]: unknown;
    }>(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("call_queue_team_status_idx").on(t.teamId, t.status),
    index("call_queue_scheduled_idx").on(t.scheduledAt),
    index("call_queue_worker_idx").on(t.assignedWorker),
    index("call_queue_lead_idx").on(t.leadId),
  ],
);

// ============================================
// CONVERSATION CONTEXT - Replace in-memory Map
// Persists conversation state for durability
// ============================================

export const conversationContext = pgTable(
  "conversation_context",
  {
    id: primaryUlid(CONVERSATION_CONTEXT_PK),
    teamId: ulidColumn()
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),

    // Unique key: phone number
    phone: varchar().notNull(),

    // Associated lead (optional)
    leadId: ulidColumn("lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),

    // Context data
    context: jsonb()
      .notNull()
      .$type<{
        firstName?: string;
        lastName?: string;
        companyName?: string;
        industry?: string;
        propertyAddress?: string;
        propertyId?: string;
        leadType?: string;
        clientId?: string;
        [key: string]: unknown;
      }>(),

    // Conversation tracking
    messageCount: integer("message_count").notNull().default(0),
    lastIntent: varchar("last_intent"),

    // History (limited to last N messages)
    history: jsonb()
      .notNull()
      .default([])
      .$type<
        Array<{
          role: "user" | "assistant";
          content: string;
          timestamp: string;
        }>
      >(),

    // TTL - when this context expires
    expiresAt: timestamp("expires_at").notNull(),
    lastMessageAt: timestamp("last_message_at").defaultNow(),

    createdAt,
    updatedAt,
  },
  (t) => [
    // Unique constraint on phone + team
    index("conv_ctx_phone_team_idx").on(t.phone, t.teamId),
    index("conv_ctx_expires_idx").on(t.expiresAt),
    index("conv_ctx_lead_idx").on(t.leadId),
  ],
);

// ============================================
// EVENT LOG - Persistent event bus log
// Streams events from the in-memory bus for durability
// ============================================

export type EventLogLevel = "info" | "warn" | "error" | "debug";

export const eventLog = pgTable(
  "event_log",
  {
    id: primaryUlid(EVENT_LOG_PK),
    teamId: ulidColumn().references(() => teams.id, { onDelete: "cascade" }),

    // Event identification
    eventType: varchar("event_type").notNull(),
    eventId: varchar("event_id"), // External event ID for deduplication

    // Level
    level: varchar().$type<EventLogLevel>().notNull().default("info"),

    // Event payload
    payload: jsonb().$type<Record<string, unknown>>(),

    // Source tracking
    source: varchar(), // Component that emitted the event
    correlationId: varchar("correlation_id"), // For tracing related events

    // Timestamps
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
    createdAt,
  },
  (t) => [
    index("event_log_team_idx").on(t.teamId),
    index("event_log_type_idx").on(t.eventType),
    index("event_log_occurred_idx").on(t.occurredAt),
    index("event_log_correlation_idx").on(t.correlationId),
    index("event_log_event_id_idx").on(t.eventId),
  ],
);

// ============================================
// RELATIONS
// ============================================

export const callQueueRelations = relations(callQueue, ({ one }) => ({
  team: one(teams, {
    fields: [callQueue.teamId],
    references: [teams.id],
  }),
  lead: one(leads, {
    fields: [callQueue.leadId],
    references: [leads.id],
  }),
}));

export const conversationContextRelations = relations(
  conversationContext,
  ({ one }) => ({
    team: one(teams, {
      fields: [conversationContext.teamId],
      references: [teams.id],
    }),
    lead: one(leads, {
      fields: [conversationContext.leadId],
      references: [leads.id],
    }),
  }),
);

export const eventLogRelations = relations(eventLog, ({ one }) => ({
  team: one(teams, {
    fields: [eventLog.teamId],
    references: [teams.id],
  }),
}));
