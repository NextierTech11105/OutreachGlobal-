/**
 * Twilio Voice Integration Schema
 *
 * Tables for multi-tenant voice number management and call logging.
 * Separate from SMS (SignalHouse) - enables per-tenant voice isolation.
 */

import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { leads } from "./leads.schema";

/**
 * Voice number capabilities
 */
export interface VoiceCapabilities {
  voice: boolean;
  sms: boolean;
  mms: boolean;
  fax?: boolean;
}

/**
 * Twilio Numbers Table
 *
 * Per-tenant voice numbers for outbound calling.
 * Each team can have multiple voice numbers (e.g., different area codes).
 *
 * NOTE: SMS numbers are managed via worker_phone_assignments + SignalHouse.
 * This table is specifically for Twilio voice numbers.
 */
export const twilioNumbers = pgTable(
  "twilio_numbers",
  {
    id: primaryUlid("twn"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Phone number (E.164 format)
    phoneNumber: varchar("phone_number", { length: 20 }).notNull(),

    // Twilio identifiers
    twilioSid: varchar("twilio_sid", { length: 100 }), // Twilio phone number SID
    twilioAccountSid: varchar("twilio_account_sid", { length: 100 }), // If using subaccounts

    // Display info
    friendlyName: varchar("friendly_name", { length: 255 }),
    locality: varchar({ length: 100 }), // City
    region: varchar({ length: 100 }), // State

    // Capabilities
    capabilities: jsonb().$type<VoiceCapabilities>().default({
      voice: true,
      sms: false,
      mms: false,
    }),

    // Webhook configuration
    voiceUrl: varchar("voice_url", { length: 500 }),
    voiceMethod: varchar("voice_method", { length: 10 }).default("POST"),
    statusCallback: varchar("status_callback", { length: 500 }),
    statusCallbackMethod: varchar("status_callback_method", {
      length: 10,
    }).default("POST"),

    // Status
    status: varchar({ length: 50 }).default("active"), // active, inactive, released
    provisionedAt: timestamp("provisioned_at"),
    releasedAt: timestamp("released_at"),

    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index("twn_team_idx").on(t.teamId),
    uniqueIndex("twn_phone_idx").on(t.phoneNumber),
    index("twn_status_idx").on(t.teamId, t.status),
  ],
);

/**
 * Call direction
 */
export type CallDirection = "inbound" | "outbound";

/**
 * Call status (matches Twilio status values)
 */
export type CallStatus =
  | "queued"
  | "initiated"
  | "ringing"
  | "in-progress"
  | "completed"
  | "busy"
  | "failed"
  | "no-answer"
  | "canceled";

/**
 * AMD (Answering Machine Detection) result
 */
export type AnsweredBy = "human" | "machine" | "fax" | "unknown";

/**
 * Twilio Call Logs Table
 *
 * Persists call history for analytics and compliance.
 * Updated via Twilio status webhooks.
 */
export const twilioCallLogs = pgTable(
  "twilio_call_logs",
  {
    id: primaryUlid("tcl"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn("lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),

    // Twilio identifiers
    callSid: varchar("call_sid", { length: 100 }).notNull(),
    parentCallSid: varchar("parent_call_sid", { length: 100 }), // For child legs

    // Call parties
    fromNumber: varchar("from_number", { length: 20 }),
    toNumber: varchar("to_number", { length: 20 }),
    direction: varchar({ length: 20 }).$type<CallDirection>(),

    // Call progress
    status: varchar({ length: 50 }).$type<CallStatus>(),
    answeredBy: varchar("answered_by", { length: 50 }).$type<AnsweredBy>(),

    // Timing
    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    durationSeconds: integer("duration_seconds"),
    ringDurationSeconds: integer("ring_duration_seconds"),

    // Recording & Transcription
    recordingUrl: varchar("recording_url", { length: 500 }),
    recordingSid: varchar("recording_sid", { length: 100 }),
    recordingDuration: integer("recording_duration"),
    transcription: text(),
    transcriptionSid: varchar("transcription_sid", { length: 100 }),

    // Agent/User info (who made/answered the call)
    userId: ulidColumn("user_id"), // Nextier user who handled call
    agentName: varchar("agent_name", { length: 100 }),

    // Queue context (if from Hot Call Queue)
    queueId: ulidColumn("queue_id"),
    queueName: varchar("queue_name", { length: 100 }),

    // Cost tracking
    price: varchar({ length: 20 }), // Call cost (string to preserve precision)
    priceUnit: varchar("price_unit", { length: 10 }).default("USD"),

    // Raw webhook data (for debugging)
    rawWebhookData: jsonb("raw_webhook_data").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index("tcl_team_idx").on(t.teamId),
    index("tcl_lead_idx").on(t.leadId),
    uniqueIndex("tcl_call_sid_idx").on(t.callSid),
    index("tcl_direction_idx").on(t.teamId, t.direction),
    index("tcl_status_idx").on(t.teamId, t.status),
    index("tcl_created_idx").on(t.teamId, t.createdAt),
  ],
);

/**
 * Type exports for use in other modules
 */
export type TwilioNumber = typeof twilioNumbers.$inferSelect;
export type NewTwilioNumber = typeof twilioNumbers.$inferInsert;

export type TwilioCallLog = typeof twilioCallLogs.$inferSelect;
export type NewTwilioCallLog = typeof twilioCallLogs.$inferInsert;
