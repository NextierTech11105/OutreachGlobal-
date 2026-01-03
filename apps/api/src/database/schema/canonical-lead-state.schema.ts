/**
 * CANONICAL LEAD STATE MACHINE SCHEMA
 * ====================================
 * Tables for the canonical event-driven lead management model.
 *
 * This schema implements the SignalHouse webhook -> Nextier SQL pattern
 * with proper idempotency, state transitions, and timer management.
 *
 * Key tables:
 * - webhookReceipts: Inbound webhook idempotency (24h TTL Redis + permanent Postgres)
 * - leadEvents: Immutable append-only event log with state transitions
 * - leadTimers: Explicit 7-day/14-day timer management
 * - outboundMessages: Send idempotency with unique send_key
 *
 * Canonical states:
 * NEW -> TOUCHED -> RESPONDED -> EMAIL_CAPTURED -> HIGH_INTENT -> IN_CALL_QUEUE -> CLOSED
 *                                                               -> SUPPRESSED (terminal)
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teams, teamsRef } from "./teams.schema";
import { leads } from "./leads.schema";

// ============================================
// CANONICAL LEAD STATE ENUM
// ============================================

export const leadStateEnum = pgEnum("lead_state_enum", [
  "new",           // Just imported, no contact yet
  "touched",       // SMS_SENT at least once
  "responded",     // Got any reply
  "email_captured", // Email extracted from conversation
  "high_intent",   // Expressed buying/selling intent
  "in_call_queue", // Escalated for human call
  "closed",        // Deal won/lost
  "suppressed",    // STOP/DNC - terminal state
]);

// Type for TypeScript
export type LeadState =
  | "new"
  | "touched"
  | "responded"
  | "email_captured"
  | "high_intent"
  | "in_call_queue"
  | "closed"
  | "suppressed";

// Valid state transitions
export const VALID_STATE_TRANSITIONS: Record<LeadState, LeadState[]> = {
  new: ["touched", "suppressed"],
  touched: ["responded", "suppressed"],
  responded: ["email_captured", "high_intent", "in_call_queue", "suppressed"],
  email_captured: ["high_intent", "in_call_queue", "suppressed"],
  high_intent: ["in_call_queue", "closed", "suppressed"],
  in_call_queue: ["closed", "suppressed"],
  closed: [], // Terminal - no transitions out
  suppressed: [], // Terminal - no transitions out
};

// ============================================
// WEBHOOK RECEIPTS - Inbound idempotency
// ============================================

export const WEBHOOK_RECEIPT_PK = "whr";

export const webhookReceipts = pgTable(
  "webhook_receipts",
  {
    id: primaryUlid(WEBHOOK_RECEIPT_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Idempotency key from webhook (message_id, event_id, etc.)
    idempotencyKey: varchar("idempotency_key").notNull(),

    // Webhook metadata
    webhookType: varchar("webhook_type").notNull(), // signalhouse, twilio, stripe
    eventType: varchar("event_type").notNull(),     // sms_received, sms_delivered, etc.

    // Processing status
    processedAt: timestamp("processed_at"),
    processingResult: varchar("processing_result"), // success, failed, skipped
    errorMessage: text("error_message"),

    // Original payload for debugging
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),

    // TTL for cleanup (set to now + 24h typically)
    expiresAt: timestamp("expires_at"),

    createdAt,
  },
  (t) => [
    // Unique constraint for idempotency
    uniqueIndex("webhook_receipts_idem_key_idx").on(t.teamId, t.idempotencyKey),

    // Lookup by webhook type
    index("webhook_receipts_type_idx").on(t.webhookType),

    // Cleanup index
    index("webhook_receipts_expires_idx").on(t.expiresAt),
  ],
);

// ============================================
// LEAD EVENTS - Immutable event log
// ============================================

export const LEAD_EVENT_PK = "lev";

export type LeadEventType =
  // Outbound events
  | "SMS_SENT"
  | "EMAIL_SENT"
  | "CALL_OUTBOUND"

  // Inbound events
  | "SMS_RECEIVED"
  | "EMAIL_RECEIVED"
  | "CALL_INBOUND"

  // Intent events
  | "EMAIL_CAPTURED"
  | "MEETING_REQUESTED"
  | "HIGH_INTENT_DETECTED"

  // Timer events
  | "TIMER_7D"
  | "TIMER_14D"

  // Terminal events
  | "OPT_OUT"
  | "DEAL_CLOSED"
  | "ARCHIVED";

export const leadEvents = pgTable(
  "lead_events",
  {
    id: primaryUlid(LEAD_EVENT_PK),
    tenantId: text("tenant_id").notNull(), // SignalHouse tenant mapping
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn("lead_id")
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),

    // Event identification
    eventType: varchar("event_type").notNull().$type<LeadEventType>(),
    eventSource: varchar("event_source").notNull(), // signalhouse, gianna, cathy, sabrina, system

    // Deduplication key (webhook_id or generated)
    dedupeKey: varchar("dedupe_key"),

    // State transition tracking
    previousState: varchar("previous_state").$type<LeadState>(),
    newState: varchar("new_state").$type<LeadState>(),

    // Event payload (message content, metadata, etc.)
    payload: jsonb().$type<{
      messageId?: string;
      messageContent?: string;
      fromPhone?: string;
      toPhone?: string;
      direction?: "inbound" | "outbound";
      worker?: string;
      extractedEmail?: string;
      timerType?: string;
      [key: string]: unknown;
    }>(),

    // Processing metadata
    processedAt: timestamp("processed_at"),
    processingNotes: text("processing_notes"),

    // Immutable - append only (no updatedAt)
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    // Fast lookup: events for a lead by time
    index("lead_events_lead_created_idx").on(t.leadId, t.createdAt),

    // Deduplication
    uniqueIndex("lead_events_dedupe_idx").on(t.dedupeKey),

    // Lookup by event type
    index("lead_events_type_idx").on(t.eventType),

    // Team scoping
    index("lead_events_team_idx").on(t.teamId),

    // Tenant mapping
    index("lead_events_tenant_idx").on(t.tenantId),

    // State transition queries
    index("lead_events_state_transition_idx").on(t.previousState, t.newState),
  ],
);

// ============================================
// LEAD TIMERS - Explicit timer management
// ============================================

export const LEAD_TIMER_PK = "ltm";

export type LeadTimerType =
  | "TIMER_7D"    // 7-day no-response check
  | "TIMER_14D"   // 14-day escalation
  | "TIMER_30D"   // 30-day archive
  | "FOLLOW_UP"   // Generic follow-up
  | "CALLBACK";   // Scheduled callback

export const leadTimers = pgTable(
  "lead_timers",
  {
    id: primaryUlid(LEAD_TIMER_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn("lead_id")
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),

    // Timer type and scheduling
    timerType: varchar("timer_type").notNull().$type<LeadTimerType>(),
    triggerAt: timestamp("trigger_at").notNull(),

    // Execution tracking
    executedAt: timestamp("executed_at"),
    cancelledAt: timestamp("cancelled_at"),
    cancelReason: varchar("cancel_reason"),

    // What to do when timer fires
    action: varchar().notNull().default("check_response"),
    actionPayload: jsonb("action_payload").$type<{
      escalateTo?: string;
      sendTemplate?: string;
      archiveReason?: string;
      [key: string]: unknown;
    }>(),

    // Retry tracking
    attempts: integer().notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastError: text("last_error"),

    createdAt,
    updatedAt,
  },
  (t) => [
    // Unique constraint: one timer per type per lead
    uniqueIndex("lead_timers_lead_type_idx").on(t.leadId, t.timerType),

    // Timer execution query (find due timers)
    index("lead_timers_trigger_idx").on(t.triggerAt),

    // Active timers (not executed, not cancelled)
    index("lead_timers_active_idx").on(t.teamId, t.executedAt, t.cancelledAt),

    // Team scoping
    index("lead_timers_team_idx").on(t.teamId),
  ],
);

// ============================================
// OUTBOUND MESSAGES - Send idempotency
// ============================================

export const OUTBOUND_MESSAGE_PK = "obm";

export type OutboundMessageStatus =
  | "pending"     // Queued for send
  | "sent"        // Sent to provider (SignalHouse)
  | "delivered"   // Delivery confirmed
  | "failed"      // Send failed
  | "skipped";    // Skipped (duplicate, rate limit, etc.)

export const outboundMessages = pgTable(
  "outbound_messages",
  {
    id: primaryUlid(OUTBOUND_MESSAGE_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn("lead_id")
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),

    // Send idempotency key: lead_id:template:date
    sendKey: varchar("send_key").notNull(),

    // Message details
    channel: varchar().notNull().default("sms"), // sms, email, voice
    templateId: varchar("template_id"),
    templateName: varchar("template_name"),

    // Phone numbers
    fromPhone: varchar("from_phone").notNull(),
    toPhone: varchar("to_phone").notNull(),

    // Content
    messageContent: text("message_content").notNull(),

    // Worker attribution
    worker: varchar(), // gianna, cathy, sabrina
    campaignId: varchar("campaign_id"),

    // Provider tracking
    providerMessageId: varchar("provider_message_id"), // SignalHouse message_id
    providerStatus: varchar("provider_status"),

    // Status
    status: varchar().$type<OutboundMessageStatus>().notNull().default("pending"),

    // Timing
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    failedAt: timestamp("failed_at"),
    failureReason: text("failure_reason"),

    // Cost tracking (optional)
    costCents: integer("cost_cents"),

    createdAt,
    updatedAt,
  },
  (t) => [
    // Send idempotency - CRITICAL
    uniqueIndex("outbound_messages_send_key_idx").on(t.sendKey),

    // Provider message lookup
    index("outbound_messages_provider_idx").on(t.providerMessageId),

    // Lead message history
    index("outbound_messages_lead_idx").on(t.leadId, t.createdAt),

    // Worker attribution
    index("outbound_messages_worker_idx").on(t.worker),

    // Status queries
    index("outbound_messages_status_idx").on(t.status),

    // Team scoping
    index("outbound_messages_team_idx").on(t.teamId),
  ],
);

// ============================================
// RELATIONS
// ============================================

export const webhookReceiptsRelations = relations(webhookReceipts, ({ one }) => ({
  team: one(teams, {
    fields: [webhookReceipts.teamId],
    references: [teams.id],
  }),
}));

export const leadEventsRelations = relations(leadEvents, ({ one }) => ({
  team: one(teams, {
    fields: [leadEvents.teamId],
    references: [teams.id],
  }),
  lead: one(leads, {
    fields: [leadEvents.leadId],
    references: [leads.id],
  }),
}));

export const leadTimersRelations = relations(leadTimers, ({ one }) => ({
  team: one(teams, {
    fields: [leadTimers.teamId],
    references: [teams.id],
  }),
  lead: one(leads, {
    fields: [leadTimers.leadId],
    references: [leads.id],
  }),
}));

export const outboundMessagesRelations = relations(outboundMessages, ({ one }) => ({
  team: one(teams, {
    fields: [outboundMessages.teamId],
    references: [teams.id],
  }),
  lead: one(leads, {
    fields: [outboundMessages.leadId],
    references: [leads.id],
  }),
}));

// ============================================
// TYPE EXPORTS
// ============================================

export type WebhookReceipt = typeof webhookReceipts.$inferSelect;
export type NewWebhookReceipt = typeof webhookReceipts.$inferInsert;

export type LeadEvent = typeof leadEvents.$inferSelect;
export type NewLeadEvent = typeof leadEvents.$inferInsert;

export type LeadTimer = typeof leadTimers.$inferSelect;
export type NewLeadTimer = typeof leadTimers.$inferInsert;

export type OutboundMessage = typeof outboundMessages.$inferSelect;
export type NewOutboundMessage = typeof outboundMessages.$inferInsert;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate a state transition
 */
export function isValidTransition(from: LeadState, to: LeadState): boolean {
  return VALID_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Generate send key for outbound message idempotency
 * Format: lead_id:template:YYYY-MM-DD
 */
export function generateSendKey(
  leadId: string,
  templateName: string,
  date: Date = new Date()
): string {
  const dateStr = date.toISOString().split("T")[0];
  return `${leadId}:${templateName}:${dateStr}`;
}

/**
 * Generate dedupe key for lead events
 */
export function generateEventDedupeKey(
  leadId: string,
  eventType: LeadEventType,
  messageId?: string
): string {
  if (messageId) {
    return `${leadId}:${eventType}:${messageId}`;
  }
  return `${leadId}:${eventType}:${Date.now()}`;
}
