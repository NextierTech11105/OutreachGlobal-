/**
 * LEAD SIGNALS SCHEMA
 * ===================
 * Append-only signal log for doctrine-compliant decision making.
 *
 * Signals are the persistent, immutable record of lead state changes.
 * They are ACCUMULATED over time and used for strategic decisions.
 *
 * Key principles:
 * - Append-only: signals are never updated or deleted
 * - Event-sourced: each signal links to its originating event
 * - AI-classified: signals are derived from AI analysis of events
 * - Human-reviewable: confidence scores enable human oversight
 */

import {
  index,
  integer,
  jsonb,
  pgTable,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { teams, teamsRef } from "./teams.schema";
import { leads } from "./leads.schema";
import { eventLog } from "./operations.schema";

// Primary key prefix
export const SIGNAL_PK = "sig";

// Signal types - the vocabulary of lead state
export type SignalType =
  // Engagement signals
  | "CONTACTED" // Initial outreach sent
  | "REPLIED" // Lead responded (any response)
  | "POSITIVE_RESPONSE" // Positive intent detected
  | "NEGATIVE_RESPONSE" // Negative intent detected
  | "QUESTION_ASKED" // Lead asked a question
  | "EMAIL_PROVIDED" // Lead shared their email

  // Interest signals
  | "INTERESTED" // Expressed interest
  | "HOT_LEAD" // High-value opportunity
  | "VALUATION_REQUESTED" // Requested property valuation
  | "CALL_REQUESTED" // Requested a phone call
  | "MEETING_REQUESTED" // Requested a meeting

  // Booking signals
  | "APPOINTMENT_SCHEDULED" // Appointment booked
  | "APPOINTMENT_CONFIRMED" // Appointment confirmed
  | "APPOINTMENT_COMPLETED" // Appointment happened
  | "APPOINTMENT_CANCELLED" // Appointment cancelled
  | "APPOINTMENT_NO_SHOW" // Lead didn't show

  // Suppression signals
  | "OPTED_OUT" // Lead opted out (STOP)
  | "WRONG_NUMBER" // Wrong number reported
  | "DO_NOT_CONTACT" // Explicit DNC request
  | "PROFANITY_DETECTED" // Hostile response

  // Workflow signals
  | "ESCALATED_TO_CATHY" // Moved to nudger
  | "ESCALATED_TO_SABRINA" // Moved to closer
  | "ARCHIVED" // Lead archived (cold bucket)
  | "REACTIVATED" // Lead brought back from archive

  // Silence signals (absence is meaningful)
  | "NO_RESPONSE_24H" // No response after 24 hours
  | "NO_RESPONSE_72H" // No response after 72 hours
  | "NO_RESPONSE_7D" // No response after 7 days
  | "NO_RESPONSE_14D" // No response after 14 days
  | "NO_RESPONSE_30D"; // No response after 30 days

// Signal source - who/what created this signal
export type SignalSource =
  | "gianna" // AI opener
  | "cathy" // AI nudger
  | "sabrina" // AI closer
  | "neva" // AI researcher
  | "system" // Automated system
  | "manual" // Human operator
  | "webhook"; // External webhook

/**
 * Lead Signals Table (Append-Only)
 *
 * This table stores all signals for leads. Each signal represents
 * a meaningful state change or observation about a lead.
 *
 * Signals are:
 * - Immutable: once created, never modified
 * - Linked: tied to the originating event
 * - Scored: confidence level for human review
 * - Accumulated: count and recency drive decisions
 */
export const leadSignals = pgTable(
  "lead_signals",
  {
    id: primaryUlid(SIGNAL_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn()
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),

    // Signal classification
    signalType: varchar("signal_type").notNull().$type<SignalType>(),

    // Signal value (flexible JSON for signal-specific data)
    signalValue: jsonb("signal_value").$type<{
      keywords?: string[]; // Detected keywords
      sentiment?: "positive" | "neutral" | "negative";
      extractedEmail?: string;
      extractedPhone?: string;
      appointmentTime?: string;
      escalateToWorker?: string;
      archiveReason?: string;
      [key: string]: unknown;
    }>(),

    // Confidence score (0-100) for human review
    confidence: integer().notNull().default(100),

    // Source tracking
    source: varchar().notNull().$type<SignalSource>(),
    sourceEventId: ulidColumn("source_event_id").references(() => eventLog.id, {
      onDelete: "set null",
    }),

    // AI reasoning (for transparency)
    aiReason: varchar("ai_reason"),

    // Immutable timestamp (no updatedAt - signals are append-only)
    createdAt: timestamp()
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    // Fast lookup: signals for a lead by time
    index("lead_signals_lead_created_idx").on(t.leadId, t.createdAt),

    // Fast lookup: signals by type
    index("lead_signals_type_idx").on(t.signalType),

    // Team scoping
    index("lead_signals_team_idx").on(t.teamId),

    // Signal counting: recent signals for scoring
    index("lead_signals_team_type_created_idx").on(
      t.teamId,
      t.signalType,
      t.createdAt,
    ),

    // Source tracking
    index("lead_signals_source_idx").on(t.source),
  ],
);

// Relations
export const leadSignalsRelations = relations(leadSignals, ({ one }) => ({
  team: one(teams, {
    fields: [leadSignals.teamId],
    references: [teams.id],
  }),
  lead: one(leads, {
    fields: [leadSignals.leadId],
    references: [leads.id],
  }),
  sourceEvent: one(eventLog, {
    fields: [leadSignals.sourceEventId],
    references: [eventLog.id],
  }),
}));

// Type exports for use in application code
export type LeadSignal = typeof leadSignals.$inferSelect;
export type NewLeadSignal = typeof leadSignals.$inferInsert;
