import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
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

// =============================================================================
// KNOWLEDGE BASE - Document Storage & AI Training
// =============================================================================

export const documentTypeEnum = pgEnum("document_type", [
  "training_data", // AI training documents
  "objection_library", // Objection handling scripts
  "faq", // Frequently asked questions
  "product_info", // Product/service information
  "competitor_intel", // Competitor analysis
  "case_study", // Success stories
  "script", // Call/SMS scripts
  "persona", // Buyer persona profiles
  "industry", // Industry-specific knowledge
  "compliance", // Legal/compliance docs
]);

export const knowledgeDocuments = pgTable(
  "knowledge_documents",
  {
    id: primaryUlid("kdoc"),
    teamId: ulidColumn()
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    uploadedById: ulidColumn().references(() => users.id, {
      onDelete: "set null",
    }),

    // Document info
    title: varchar().notNull(),
    description: text(),
    documentType: documentTypeEnum().default("training_data"),
    fileUrl: text(), // S3/Spaces URL
    fileName: text(),
    fileSize: integer(),
    mimeType: varchar(),

    // Parsed content for AI
    content: text(), // Extracted text content
    summary: text(), // AI-generated summary
    embeddings: jsonb(), // Vector embeddings for RAG

    // Organization
    tags: text().array().default([]),
    category: varchar(),

    // Usage tracking
    usageCount: integer().default(0),
    lastUsedAt: timestamp(),

    // Status
    isActive: boolean().default(true),
    isProcessed: boolean().default(false), // Has been parsed/embedded

    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("knowledge_documents_team_idx").on(t.teamId),
    index("knowledge_documents_type_idx").on(t.documentType),
    index("knowledge_documents_category_idx").on(t.category),
  ],
);

// =============================================================================
// WORKER PERSONALITIES - AI Agent Tuning
// =============================================================================

export const workerPersonalities = pgTable(
  "worker_personalities",
  {
    id: primaryUlid("wper"),
    teamId: ulidColumn()
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    createdById: ulidColumn().references(() => users.id, {
      onDelete: "set null",
    }),

    // Worker identity
    workerId: varchar().notNull(), // 'gianna', 'sabrina', 'cathy', or custom
    name: varchar().notNull(),
    role: varchar().notNull(),
    description: text(),

    // Personality sliders (0-100)
    warmth: integer().default(70),
    directness: integer().default(60),
    humor: integer().default(40),
    formality: integer().default(30),
    urgency: integer().default(50),
    nudging: integer().default(60),
    assertiveness: integer().default(65),
    empathy: integer().default(70),
    curiosity: integer().default(60),
    closingPush: integer().default(55),

    // Voice settings
    voiceStyle: varchar().default("conversational-professional"),
    greeting: varchar().default("Hey"),
    signOff: varchar().default("Best"),

    // Core principles (never violated)
    principles: text().array().default([]),
    neverDo: text().array().default([]),

    // Industry-specific context
    industry: varchar(),
    targetAudience: varchar(),

    // Preset name if based on a preset
    presetName: varchar(),

    isActive: boolean().default(true),
    isDefault: boolean().default(false),

    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("worker_personalities_team_idx").on(t.teamId),
    index("worker_personalities_worker_idx").on(t.workerId),
  ],
);

// =============================================================================
// SCHEDULED EVENTS - SMS/Calls with Unique Event IDs
// =============================================================================

export const eventTypeEnum = pgEnum("event_type", [
  "sms_single", // Single SMS
  "sms_blast", // Bulk SMS blast
  "sms_drip", // Drip campaign step
  "call_single", // Single call
  "call_power", // Power dialer session
  "email_single", // Single email
  "email_sequence", // Email sequence step
  "appointment", // Scheduled appointment
  "follow_up", // Automated follow-up
  "reminder", // Reminder notification
]);

export const eventStatusEnum = pgEnum("event_status", [
  "scheduled", // Waiting to execute
  "in_progress", // Currently executing
  "completed", // Successfully done
  "failed", // Failed to execute
  "cancelled", // Manually cancelled
  "paused", // Temporarily paused
]);

export const scheduledEvents = pgTable(
  "scheduled_events",
  {
    id: primaryUlid("sevt"), // Unique event ID
    teamId: ulidColumn()
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    campaignId: ulidColumn(), // Link to campaign if part of one
    leadId: ulidColumn(), // Target lead if individual
    createdById: ulidColumn().references(() => users.id, {
      onDelete: "set null",
    }),

    // Event details
    eventType: eventTypeEnum().notNull(),
    title: varchar().notNull(),
    description: text(),

    // Scheduling
    scheduledAt: timestamp().notNull(),
    executedAt: timestamp(),
    completedAt: timestamp(),
    timezone: varchar().default("America/New_York"),

    // Cadence info (for drip/sequence)
    cadenceStep: integer(), // Step number in sequence
    cadenceDelay: integer(), // Minutes to wait before this step
    parentEventId: ulidColumn(), // Link to parent event in chain

    // Content
    content: text(), // Message content / script
    templateId: ulidColumn(), // Reference to message template

    // Worker assignment
    workerId: varchar(), // 'gianna', 'sabrina', etc.
    workerPersonalityId: ulidColumn().references(() => workerPersonalities.id),

    // Execution details
    status: eventStatusEnum().default("scheduled"),
    attempts: integer().default(0),
    maxAttempts: integer().default(3),
    lastError: text(),

    // Target info
    phoneNumber: varchar(),
    email: varchar(),
    recipientName: varchar(),

    // Results
    result: jsonb(), // Response data, delivery status, etc.

    // Calendar display
    color: varchar().default("#3b82f6"), // Blue default
    allDay: boolean().default(false),

    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("scheduled_events_team_idx").on(t.teamId),
    index("scheduled_events_campaign_idx").on(t.campaignId),
    index("scheduled_events_lead_idx").on(t.leadId),
    index("scheduled_events_scheduled_at_idx").on(t.scheduledAt),
    index("scheduled_events_status_idx").on(t.status),
    index("scheduled_events_type_idx").on(t.eventType),
  ],
);

// =============================================================================
// CADENCE TEMPLATES - Reusable Outreach Sequences
// =============================================================================

export const cadenceTemplates = pgTable(
  "cadence_templates",
  {
    id: primaryUlid("cadt"),
    teamId: ulidColumn()
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    createdById: ulidColumn().references(() => users.id, {
      onDelete: "set null",
    }),

    name: varchar().notNull(),
    description: text(),

    // Sequence steps
    steps: jsonb()
      .$type<
        {
          stepNumber: number;
          delayMinutes: number; // Minutes after previous step
          eventType: string;
          content: string;
          workerId?: string;
          subject?: string; // For emails
        }[]
      >()
      .default([]),

    // Defaults
    defaultWorkerId: varchar().default("gianna"),
    defaultTimezone: varchar().default("America/New_York"),

    // Business hours enforcement
    respectBusinessHours: boolean().default(true),
    businessHoursStart: varchar().default("09:00"),
    businessHoursEnd: varchar().default("17:00"),
    businessDays: text().array().default(["Mon", "Tue", "Wed", "Thu", "Fri"]),

    // Stats
    timesUsed: integer().default(0),
    avgResponseRate: integer(), // Percentage

    isActive: boolean().default(true),
    isSystem: boolean().default(false), // System templates can't be deleted

    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("cadence_templates_team_idx").on(t.teamId),
    index("cadence_templates_active_idx").on(t.isActive),
  ],
);

// =============================================================================
// INTELLIGENCE METRICS - Compounding AI Learning
// =============================================================================

export const intelligenceMetrics = pgTable(
  "intelligence_metrics",
  {
    id: primaryUlid("imet"),
    teamId: ulidColumn()
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),

    // Time period
    periodStart: timestamp().notNull(),
    periodEnd: timestamp().notNull(),
    periodType: varchar().default("daily"), // daily, weekly, monthly

    // Volume metrics
    totalOutreach: integer().default(0),
    totalResponses: integer().default(0),
    totalConversations: integer().default(0),
    totalAppointments: integer().default(0),

    // Response metrics
    positiveResponses: integer().default(0),
    negativeResponses: integer().default(0),
    neutralResponses: integer().default(0),
    optOuts: integer().default(0),

    // Conversion metrics
    responseRate: integer(), // Percentage * 100
    positiveRate: integer(),
    appointmentRate: integer(),
    optOutRate: integer(),

    // AI performance
    aiHandledCount: integer().default(0),
    humanHandledCount: integer().default(0),
    aiAccuracy: integer(), // Percentage * 100

    // Learning data
    newPatternsDiscovered: integer().default(0),
    objectionTypesEncountered: jsonb().$type<Record<string, number>>(),
    bestPerformingTemplates: jsonb().$type<string[]>(),
    worstPerformingTemplates: jsonb().$type<string[]>(),

    // Compound score (increases over time with learning)
    intelligenceScore: integer().default(0),
    scoreChange: integer().default(0), // vs previous period

    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("intelligence_metrics_team_idx").on(t.teamId),
    index("intelligence_metrics_period_idx").on(t.periodStart, t.periodEnd),
  ],
);

// =============================================================================
// RELATIONS
// =============================================================================

export const knowledgeDocumentsRelations = relations(
  knowledgeDocuments,
  ({ one }) => ({
    team: one(teams, {
      fields: [knowledgeDocuments.teamId],
      references: [teams.id],
    }),
    uploadedBy: one(users, {
      fields: [knowledgeDocuments.uploadedById],
      references: [users.id],
    }),
  }),
);

export const workerPersonalitiesRelations = relations(
  workerPersonalities,
  ({ one }) => ({
    team: one(teams, {
      fields: [workerPersonalities.teamId],
      references: [teams.id],
    }),
    createdBy: one(users, {
      fields: [workerPersonalities.createdById],
      references: [users.id],
    }),
  }),
);

export const scheduledEventsRelations = relations(
  scheduledEvents,
  ({ one }) => ({
    team: one(teams, {
      fields: [scheduledEvents.teamId],
      references: [teams.id],
    }),
    createdBy: one(users, {
      fields: [scheduledEvents.createdById],
      references: [users.id],
    }),
    workerPersonality: one(workerPersonalities, {
      fields: [scheduledEvents.workerPersonalityId],
      references: [workerPersonalities.id],
    }),
    parentEvent: one(scheduledEvents, {
      fields: [scheduledEvents.parentEventId],
      references: [scheduledEvents.id],
    }),
  }),
);

export const cadenceTemplatesRelations = relations(
  cadenceTemplates,
  ({ one }) => ({
    team: one(teams, {
      fields: [cadenceTemplates.teamId],
      references: [teams.id],
    }),
    createdBy: one(users, {
      fields: [cadenceTemplates.createdById],
      references: [users.id],
    }),
  }),
);

export const intelligenceMetricsRelations = relations(
  intelligenceMetrics,
  ({ one }) => ({
    team: one(teams, {
      fields: [intelligenceMetrics.teamId],
      references: [teams.id],
    }),
  }),
);
