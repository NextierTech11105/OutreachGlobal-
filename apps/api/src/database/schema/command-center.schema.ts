/**
 * NEXTIER COMMAND CENTER SCHEMA
 * =============================
 * The brain of the operation - Knowledge Base, AI Tuning, Scheduled Events, Visual Flows
 *
 * SIMPLE NAMING GUIDE:
 * - "Plays" = Automation flows (like a playbook)
 * - "Moves" = Individual actions within a play
 * - "Brain" = Knowledge base documents
 * - "Voice" = AI personality/tone settings
 * - "Schedule" = Timed events (SMS, calls, emails)
 * - "Calendar" = Visual timeline of all scheduled events
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
import { users } from "./users.schema";
import { leads } from "./leads.schema";
import { campaigns } from "./campaigns.schema";

// ============================================
// KNOWLEDGE BASE - "THE BRAIN"
// Documents, FAQs, Scripts that AI learns from
// ============================================

export const knowledgeDocuments = pgTable(
  "knowledge_documents",
  {
    id: primaryUlid("kdoc"),
    teamId: ulidColumn()
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),

    // Simple naming
    title: varchar().notNull(),
    description: text(),

    // Document types: script, faq, objection, product, company, industry
    docType: varchar("doc_type").notNull().default("general"),

    // The actual content (markdown supported)
    content: text().notNull(),

    // File upload (PDF, DOCX stored in DO Spaces)
    fileUrl: text("file_url"),
    fileName: varchar("file_name"),
    fileSize: integer("file_size"),
    mimeType: varchar("mime_type"),

    // Extracted/processed text from uploaded files
    extractedText: text("extracted_text"),

    // Vector embedding for semantic search (stored separately in pgvector if needed)
    embeddingId: varchar("embedding_id"),

    // Who can use this: gianna, sabrina, cathy, all
    assignedWorkers: text("assigned_workers").array().default(["all"]),

    // Tags for organization
    tags: text().array().default([]),

    // Usage tracking
    usageCount: integer("usage_count").default(0),
    lastUsedAt: timestamp("last_used_at"),

    // Status
    isActive: boolean("is_active").default(true),
    isFavorite: boolean("is_favorite").default(false),

    createdById: ulidColumn("created_by_id").references(() => users.id),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("knowledge_docs_team_idx").on(t.teamId),
    index("knowledge_docs_type_idx").on(t.docType),
    index("knowledge_docs_workers_idx").on(t.assignedWorkers),
  ],
);

// ============================================
// AI VOICE CONFIG - "THE VOICE"
// Personality, tone, style per worker
// ============================================

export const workerVoiceConfigs = pgTable(
  "worker_voice_configs",
  {
    id: primaryUlid("wvc"),
    teamId: ulidColumn()
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),

    // Worker: gianna, sabrina, cathy
    workerId: varchar("worker_id").notNull(),
    workerName: varchar("worker_name").notNull(),

    // Personality sliders (0-100)
    warmth: integer().default(70),
    directness: integer().default(60),
    humor: integer().default(40),
    formality: integer().default(30),
    urgency: integer().default(50),
    assertiveness: integer().default(65),
    empathy: integer().default(70),
    closingPush: integer("closing_push").default(55),

    // Tone preset: professional, friendly, casual, urgent, empathetic
    tonePreset: varchar("tone_preset").default("friendly"),

    // Custom instructions for this worker
    customInstructions: text("custom_instructions"),

    // Response templates per scenario
    templates: jsonb().$type<{
      greeting?: string;
      signOff?: string;
      objectionHandling?: string;
      followUp?: string;
      closing?: string;
    }>(),

    // Industry-specific vocab
    industryTerms: text("industry_terms").array().default([]),

    // Never say these words
    blacklistedWords: text("blacklisted_words").array().default([]),

    isActive: boolean("is_active").default(true),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("worker_voice_team_idx").on(t.teamId),
    index("worker_voice_worker_idx").on(t.workerId),
  ],
);

// ============================================
// PLAYS - Visual Automation Flows
// The playbook - trigger -> actions -> result
// ============================================

export const automationPlays = pgTable(
  "automation_plays",
  {
    id: primaryUlid("play"),
    teamId: ulidColumn()
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),

    // Human-readable name like "If No Reply in 3 Days"
    name: varchar().notNull(),
    description: text(),

    // Visual label color for the UI
    color: varchar().default("blue"),
    icon: varchar().default("zap"),

    // Trigger type: label_added, no_response, message_received, calendar_booked, etc.
    triggerType: varchar("trigger_type").notNull(),

    // Trigger config (e.g., which label, how many days, etc.)
    triggerConfig: jsonb("trigger_config").$type<{
      label?: string;
      days?: number;
      messageContains?: string;
      fromWorker?: string;
    }>(),

    // The steps/moves in this play
    steps: jsonb().$type<PlayStep[]>().notNull().default([]),

    // Stats
    timesRun: integer("times_run").default(0),
    lastRunAt: timestamp("last_run_at"),
    successRate: integer("success_rate").default(0),

    // Status
    isActive: boolean("is_active").default(true),
    isDraft: boolean("is_draft").default(false),

    createdById: ulidColumn("created_by_id").references(() => users.id),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("plays_team_idx").on(t.teamId),
    index("plays_trigger_idx").on(t.triggerType),
    index("plays_active_idx").on(t.isActive),
  ],
);

// Step definition for plays
export interface PlayStep {
  id: string; // ULID for each step
  order: number;
  actionType:
    | "send_sms"
    | "send_email"
    | "schedule_call"
    | "add_label"
    | "remove_label"
    | "assign_worker"
    | "wait"
    | "condition"
    | "webhook"
    | "update_lead";
  config: Record<string, unknown>;
  // For branching/conditions
  onSuccess?: string; // ID of next step
  onFailure?: string; // ID of step if failed
}

// ============================================
// SCHEDULED EVENTS - "THE CALENDAR"
// Every SMS, call, email gets a unique event ID
// ============================================

export const scheduledEvents = pgTable(
  "scheduled_events",
  {
    id: primaryUlid("evt"),
    teamId: ulidColumn()
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),

    // What campaign/play triggered this
    campaignId: ulidColumn("campaign_id").references(() => campaigns.id),
    playId: ulidColumn("play_id").references(() => automationPlays.id),

    // Who is this for
    leadId: ulidColumn("lead_id").references(() => leads.id),

    // Event type: sms, call, email, reminder, task
    eventType: varchar("event_type").notNull(),

    // When should this fire
    scheduledAt: timestamp("scheduled_at").notNull(),
    timezone: varchar().default("America/New_York"),

    // What's the content
    content: text(),
    templateId: ulidColumn("template_id"),

    // Cadence info (for series)
    isPartOfCadence: boolean("is_part_of_cadence").default(false),
    cadenceStep: integer("cadence_step"),
    cadenceTotal: integer("cadence_total"),

    // Status: pending, sent, failed, cancelled, completed
    status: varchar().default("pending"),
    statusReason: text("status_reason"),

    // Execution tracking
    executedAt: timestamp("executed_at"),
    executionResult: jsonb("execution_result"),

    // Worker assignment
    assignedWorker: varchar("assigned_worker"),

    // Metadata
    metadata: jsonb(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("events_team_idx").on(t.teamId),
    index("events_campaign_idx").on(t.campaignId),
    index("events_lead_idx").on(t.leadId),
    index("events_scheduled_idx").on(t.scheduledAt),
    index("events_status_idx").on(t.status),
    index("events_type_idx").on(t.eventType),
  ],
);

// ============================================
// CAMPAIGN CADENCES - "THE SCHEDULE"
// Pre-defined sequences for campaigns
// ============================================

export const campaignCadences = pgTable(
  "campaign_cadences",
  {
    id: primaryUlid("cad"),
    teamId: ulidColumn()
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    campaignId: ulidColumn("campaign_id")
      .references(() => campaigns.id, { onDelete: "cascade" })
      .notNull(),

    name: varchar().notNull(),
    description: text(),

    // Cadence type: drip, blast, smart (AI decides timing)
    cadenceType: varchar("cadence_type").default("drip"),

    // The steps in order
    steps: jsonb().$type<CadenceStep[]>().notNull().default([]),

    // Timing preferences
    sendWindow: jsonb("send_window").$type<{
      startHour: number; // 9 = 9am
      endHour: number; // 17 = 5pm
      daysOfWeek: number[]; // 1-7, Monday = 1
      timezone: string;
    }>(),

    // Stats
    totalEnrolled: integer("total_enrolled").default(0),
    totalCompleted: integer("total_completed").default(0),
    responseRate: integer("response_rate").default(0),

    isActive: boolean("is_active").default(true),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("cadences_team_idx").on(t.teamId),
    index("cadences_campaign_idx").on(t.campaignId),
  ],
);

export interface CadenceStep {
  id: string; // ULID
  order: number;
  dayOffset: number; // Day 0, Day 1, Day 3, etc.
  timeOfDay?: string; // "09:00" or "smart" for AI timing
  channel: "sms" | "email" | "call" | "voicemail_drop";
  templateId?: string;
  content?: string;
  worker?: "gianna" | "sabrina" | "cathy";
  // Stop conditions
  stopIf?: ("replied" | "booked" | "opted_out" | "converted")[];
}

// ============================================
// CONVERSATION LABELS - Like Easify's Labels
// Simple tagging system for inbox management
// ============================================

export const conversationLabels = pgTable(
  "conversation_labels",
  {
    id: primaryUlid("lbl"),
    teamId: ulidColumn()
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),

    // Simple name: "Hot Lead", "Needs Follow-up", "Email Captured"
    name: varchar().notNull(),
    slug: varchar().notNull(),

    // Visual
    color: varchar().default("gray"),
    icon: varchar(),

    // Auto-apply rules
    autoApplyOn: jsonb("auto_apply_on").$type<{
      trigger: string;
      conditions?: Record<string, unknown>;
    }>(),

    // Stats
    count: integer().default(0),

    isSystem: boolean("is_system").default(false),
    isActive: boolean("is_active").default(true),
    sortOrder: integer("sort_order").default(0),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("labels_team_idx").on(t.teamId),
    index("labels_slug_idx").on(t.slug),
  ],
);

// Lead-Label junction
export const leadLabels = pgTable(
  "lead_labels",
  {
    id: primaryUlid("ll"),
    leadId: ulidColumn("lead_id")
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),
    labelId: ulidColumn("label_id")
      .references(() => conversationLabels.id, { onDelete: "cascade" })
      .notNull(),
    appliedAt: timestamp("applied_at").defaultNow(),
    appliedBy: ulidColumn("applied_by").references(() => users.id),
    // Could be auto or manual
    source: varchar().default("manual"),
  },
  (t) => [
    index("lead_labels_lead_idx").on(t.leadId),
    index("lead_labels_label_idx").on(t.labelId),
  ],
);

// ============================================
// INTELLIGENCE LOG - Compounding Learning
// Every interaction teaches the AI
// ============================================

export const intelligenceLog = pgTable(
  "intelligence_log",
  {
    id: primaryUlid("intel"),
    teamId: ulidColumn()
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),

    // What happened
    eventType: varchar("event_type").notNull(), // response_received, objection_handled, meeting_booked, etc.

    // Context
    leadId: ulidColumn("lead_id").references(() => leads.id),
    workerId: varchar("worker_id"),
    campaignId: ulidColumn("campaign_id").references(() => campaigns.id),

    // The interaction
    inputMessage: text("input_message"),
    outputMessage: text("output_message"),

    // Result
    outcome: varchar(), // positive, negative, neutral
    wasSuccessful: boolean("was_successful"),

    // Learning data
    patterns: jsonb().$type<{
      objectionType?: string;
      responseStyle?: string;
      closingTechnique?: string;
      timeToRespond?: number;
    }>(),

    // Human feedback
    humanFeedback: varchar("human_feedback"), // approved, edited, rejected
    editedResponse: text("edited_response"),

    createdAt,
  },
  (t) => [
    index("intel_team_idx").on(t.teamId),
    index("intel_event_idx").on(t.eventType),
    index("intel_outcome_idx").on(t.outcome),
    index("intel_worker_idx").on(t.workerId),
  ],
);

// ============================================
// RELATIONS
// ============================================

export const knowledgeDocumentsRelations = relations(
  knowledgeDocuments,
  ({ one }) => ({
    team: one(teams, {
      fields: [knowledgeDocuments.teamId],
      references: [teams.id],
    }),
    createdBy: one(users, {
      fields: [knowledgeDocuments.createdById],
      references: [users.id],
    }),
  }),
);

export const automationPlaysRelations = relations(
  automationPlays,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [automationPlays.teamId],
      references: [teams.id],
    }),
    createdBy: one(users, {
      fields: [automationPlays.createdById],
      references: [users.id],
    }),
    events: many(scheduledEvents),
  }),
);

export const scheduledEventsRelations = relations(
  scheduledEvents,
  ({ one }) => ({
    team: one(teams, {
      fields: [scheduledEvents.teamId],
      references: [teams.id],
    }),
    campaign: one(campaigns, {
      fields: [scheduledEvents.campaignId],
      references: [campaigns.id],
    }),
    play: one(automationPlays, {
      fields: [scheduledEvents.playId],
      references: [automationPlays.id],
    }),
    lead: one(leads, {
      fields: [scheduledEvents.leadId],
      references: [leads.id],
    }),
  }),
);

export const conversationLabelsRelations = relations(
  conversationLabels,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [conversationLabels.teamId],
      references: [teams.id],
    }),
    leadLabels: many(leadLabels),
  }),
);

export const leadLabelsRelations = relations(leadLabels, ({ one }) => ({
  lead: one(leads, {
    fields: [leadLabels.leadId],
    references: [leads.id],
  }),
  label: one(conversationLabels, {
    fields: [leadLabels.labelId],
    references: [conversationLabels.id],
  }),
  appliedByUser: one(users, {
    fields: [leadLabels.appliedBy],
    references: [users.id],
  }),
}));
