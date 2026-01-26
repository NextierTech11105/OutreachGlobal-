/**
 * Voice Broadcast Schema
 *
 * Supports:
 * - Ringless Voicemail Drop (AMD detection → leave message)
 * - Voice Broadcasting (play message to live answers)
 * - IVR Menus (DTMF keypress routing)
 * - Voice Campaign tracking
 */
import {
  index,
  pgTable,
  varchar,
  boolean,
  integer,
  timestamp,
  text,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { primaryUlid } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

// ============================================================
// ENUMS
// ============================================================

export const voiceCampaignTypeEnum = pgEnum("voice_campaign_type", [
  "ringless_vm",      // Drop voicemail without ringing
  "broadcast",        // Play message to live answers
  "ivr",              // Interactive menu system
  "power_dial",       // Agent-driven with auto-dial
]);

export const voiceCampaignStatusEnum = pgEnum("voice_campaign_status", [
  "draft",
  "scheduled",
  "running",
  "paused",
  "completed",
  "cancelled",
]);

export const voiceCallResultEnum = pgEnum("voice_call_result", [
  "pending",
  "human_answer",     // Live person answered
  "machine_answer",   // Voicemail detected
  "vm_dropped",       // Successfully left voicemail
  "no_answer",
  "busy",
  "failed",
  "cancelled",
]);

// ============================================================
// VOICE CAMPAIGNS
// ============================================================

export const VOICE_CAMPAIGN_PK = "vcmp";

export const voiceCampaigns = pgTable(
  "voice_campaigns",
  {
    id: primaryUlid(VOICE_CAMPAIGN_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Campaign info
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    campaignType: voiceCampaignTypeEnum("campaign_type").notNull(),
    status: voiceCampaignStatusEnum("status").notNull().default("draft"),

    // Audio configuration
    recordingUrl: text("recording_url"),              // Pre-recorded message URL
    recordingSid: varchar("recording_sid"),           // Twilio recording SID
    ttsMessage: text("tts_message"),                  // Text-to-speech fallback
    ttsVoice: varchar("tts_voice").default("Polly.Joanna"), // AWS Polly voice

    // IVR configuration (for ivr campaign type)
    ivrMenuId: varchar("ivr_menu_id"),                // Reference to IVR menu

    // Scheduling
    scheduledAt: timestamp("scheduled_at"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),

    // Limits & throttling
    maxConcurrentCalls: integer("max_concurrent_calls").default(10),
    callsPerMinute: integer("calls_per_minute").default(30),
    dailyLimit: integer("daily_limit").default(1000),

    // Caller ID
    fromNumber: varchar("from_number"),               // Twilio number to call from

    // Stats (denormalized for quick access)
    totalLeads: integer("total_leads").default(0),
    callsAttempted: integer("calls_attempted").default(0),
    callsCompleted: integer("calls_completed").default(0),
    humanAnswers: integer("human_answers").default(0),
    machineAnswers: integer("machine_answers").default(0),
    vmDropped: integer("vm_dropped").default(0),
    noAnswers: integer("no_answers").default(0),
    failed: integer("failed").default(0),

    // Cost tracking
    estimatedCost: integer("estimated_cost").default(0),  // cents
    actualCost: integer("actual_cost").default(0),        // cents

    createdAt,
    updatedAt,
  },
  (t) => [
    index("vcmp_team_idx").on(t.teamId),
    index("vcmp_status_idx").on(t.teamId, t.status),
    index("vcmp_type_idx").on(t.teamId, t.campaignType),
  ]
);

// ============================================================
// VOICE CAMPAIGN LEADS (Queue)
// ============================================================

export const VOICE_CAMPAIGN_LEAD_PK = "vcl";

export const voiceCampaignLeads = pgTable(
  "voice_campaign_leads",
  {
    id: primaryUlid(VOICE_CAMPAIGN_LEAD_PK),
    campaignId: varchar("campaign_id").notNull(),
    leadId: varchar("lead_id"),                       // Optional - can call without lead record
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Contact info
    phoneNumber: varchar("phone_number").notNull(),
    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    company: varchar("company"),

    // Queue position & status
    queuePosition: integer("queue_position").notNull(),
    result: voiceCallResultEnum("result").notNull().default("pending"),

    // Call details
    callSid: varchar("call_sid"),
    callDurationSeconds: integer("call_duration_seconds"),
    answeredBy: varchar("answered_by"),               // human | machine | fax | unknown

    // Timing
    scheduledAt: timestamp("scheduled_at"),
    attemptedAt: timestamp("attempted_at"),
    answeredAt: timestamp("answered_at"),
    completedAt: timestamp("completed_at"),

    // IVR response (if applicable)
    dtmfInput: varchar("dtmf_input"),                 // What keys they pressed
    ivrPath: jsonb("ivr_path"),                       // Menu navigation path

    // Retry logic
    attemptCount: integer("attempt_count").default(0),
    maxAttempts: integer("max_attempts").default(3),
    nextRetryAt: timestamp("next_retry_at"),

    // Error tracking
    errorMessage: text("error_message"),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("vcl_campaign_idx").on(t.campaignId),
    index("vcl_lead_idx").on(t.leadId),
    index("vcl_queue_idx").on(t.campaignId, t.queuePosition),
    index("vcl_result_idx").on(t.campaignId, t.result),
    index("vcl_phone_idx").on(t.phoneNumber),
  ]
);

// ============================================================
// IVR MENUS (Voice Command Trees)
// ============================================================

export const IVR_MENU_PK = "ivr";

export const ivrMenus = pgTable(
  "ivr_menus",
  {
    id: primaryUlid(IVR_MENU_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Menu info
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),

    // Root greeting
    greetingRecordingUrl: text("greeting_recording_url"),
    greetingTts: text("greeting_tts"),
    greetingVoice: varchar("greeting_voice").default("Polly.Joanna"),

    // Menu options (DTMF → action mapping)
    // Example: { "1": { action: "transfer", number: "+1234567890" }, "2": { action: "submenu", menuId: "ivr_xxx" } }
    menuOptions: jsonb("menu_options").notNull().default({}),

    // Timeout & invalid handling
    timeoutSeconds: integer("timeout_seconds").default(10),
    maxRetries: integer("max_retries").default(3),
    timeoutRecordingUrl: text("timeout_recording_url"),
    timeoutTts: text("timeout_tts"),
    invalidRecordingUrl: text("invalid_recording_url"),
    invalidTts: text("invalid_tts"),

    // Default action after max retries
    fallbackAction: varchar("fallback_action").default("hangup"), // hangup | transfer | voicemail
    fallbackNumber: varchar("fallback_number"),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("ivr_team_idx").on(t.teamId),
    index("ivr_active_idx").on(t.teamId, t.isActive),
  ]
);

// ============================================================
// VOICE RECORDINGS (Uploaded audio files)
// ============================================================

export const VOICE_RECORDING_PK = "vrec";

export const voiceRecordings = pgTable(
  "voice_recordings",
  {
    id: primaryUlid(VOICE_RECORDING_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Recording info
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Storage
    url: text("url").notNull(),                       // S3/Spaces URL
    twilioSid: varchar("twilio_sid"),                 // If uploaded to Twilio

    // Metadata
    durationSeconds: integer("duration_seconds"),
    fileSizeBytes: integer("file_size_bytes"),
    mimeType: varchar("mime_type"),

    // Categorization
    category: varchar("category"),                    // greeting | voicemail | ivr | broadcast
    isActive: boolean("is_active").notNull().default(true),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("vrec_team_idx").on(t.teamId),
    index("vrec_category_idx").on(t.teamId, t.category),
  ]
);

// ============================================================
// TYPE EXPORTS
// ============================================================

export type VoiceCampaign = typeof voiceCampaigns.$inferSelect;
export type NewVoiceCampaign = typeof voiceCampaigns.$inferInsert;

export type VoiceCampaignLead = typeof voiceCampaignLeads.$inferSelect;
export type NewVoiceCampaignLead = typeof voiceCampaignLeads.$inferInsert;

export type IvrMenu = typeof ivrMenus.$inferSelect;
export type NewIvrMenu = typeof ivrMenus.$inferInsert;

export type VoiceRecording = typeof voiceRecordings.$inferSelect;
export type NewVoiceRecording = typeof voiceRecordings.$inferInsert;
