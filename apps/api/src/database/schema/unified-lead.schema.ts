import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { personas } from "./persona.schema";
import { businesses } from "./business-owner.schema";
import { properties } from "./properties.schema";
import { campaigns } from "./campaigns.schema";

// ============================================================
// ENUMS
// ============================================================

export const entityTypeEnum = pgEnum("entity_type_enum", [
  "entity", // Generic/unknown
  "company", // Business entity
  "person", // Individual contact
  "property", // Real estate asset
  "technology", // Tech stack info
]);

export const leadSourceEnum = pgEnum("lead_source_enum", [
  "usbizdata",
  "realestateapi",
  "tracerfy",
  "trestle",
  "apollo",
  "manual",
  "csv_import",
  "webhook",
]);

export const contactTypeEnum = pgEnum("contact_type_enum", [
  "mobile",
  "landline",
  "voip",
  "fax",
  "personal_email",
  "business_email",
  "mailing_address",
  "property_address",
  "business_address",
]);

export const changelogCategoryEnum = pgEnum("changelog_category_enum", [
  "identity",
  "contact",
  "score",
  "campaign",
  "enrichment",
  "compliance",
]);

export const priorityTierEnum = pgEnum("priority_tier_enum", [
  "hot",
  "warm",
  "cold",
  "dead",
]);

export const sdrWorkerEnum = pgEnum("sdr_worker_enum", [
  "gianna",
  "cathy",
  "sabrina",
]);

export const sdrChannelEnum = pgEnum("sdr_channel_enum", [
  "sms",
  "email",
  "call",
]);

export const sdrActionEnum = pgEnum("sdr_action_enum", [
  "dial",
  "sms",
  "email",
  "wait",
  "escalate",
  "pause",
]);

// Reuse existing lead state enum
export const leadStateCadenceEnum = pgEnum("lead_state_cadence", [
  "new",
  "touched",
  "retargeting",
  "responded",
  "soft_interest",
  "email_captured",
  "content_nurture",
  "high_intent",
  "appointment_booked",
  "in_call_queue",
  "closed",
  "suppressed",
]);

// ============================================================
// UNIFIED LEADS TABLE
// ============================================================

export const unifiedLeads = pgTable(
  "unified_leads",
  {
    // IDENTITY ANCHOR (Stable)
    id: primaryUlid("ulead"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    entityType: entityTypeEnum("entity_type").notNull().default("entity"),

    // External references (for deduplication)
    externalIds: jsonb("external_ids")
      .$type<{
        usbizdata?: string;
        realestateapi?: string;
        tracerfy?: string;
        apollo?: string;
        [key: string]: string | undefined;
      }>()
      .default({}),

    // Entity links
    personaId: ulidColumn().references(() => personas.id, {
      onDelete: "set null",
    }),
    businessId: ulidColumn().references(() => businesses.id, {
      onDelete: "set null",
    }),
    propertyId: ulidColumn().references(() => properties.id, {
      onDelete: "set null",
    }),

    // CLASSIFICATION (Anchored)
    sicCode: varchar({ length: 10 }),
    sicDescription: varchar({ length: 255 }),
    naicsCode: varchar({ length: 10 }),
    naicsDescription: varchar({ length: 255 }),
    sector: varchar({ length: 100 }),
    subSector: varchar({ length: 100 }),
    entityLegalType: varchar({ length: 50 }),
    yearFounded: integer(),
    employeeRange: varchar({ length: 50 }),
    revenueRange: varchar({ length: 50 }),
    propertyType: varchar({ length: 50 }),
    propertyClass: varchar({ length: 50 }),

    // DENORMALIZED IDENTITY (Mutable)
    firstName: varchar({ length: 100 }),
    lastName: varchar({ length: 100 }),
    fullName: varchar({ length: 255 }),
    companyName: varchar({ length: 255 }),
    dba: varchar({ length: 255 }),
    title: varchar({ length: 100 }),
    roleType: varchar({ length: 50 }).default("unknown"),
    isDecisionMaker: boolean().default(false),

    // BEST CONTACT INFO (Mutable - denormalized)
    primaryPhone: varchar({ length: 20 }),
    primaryPhoneType: varchar({ length: 20 }),
    primaryPhoneScore: integer().default(0),
    primaryEmail: varchar({ length: 255 }),
    primaryEmailType: varchar({ length: 20 }),
    primaryEmailScore: integer().default(0),
    primaryStreet: varchar({ length: 255 }),
    primaryCity: varchar({ length: 100 }),
    primaryState: varchar({ length: 2 }),
    primaryZip: varchar({ length: 10 }),
    primaryCounty: varchar({ length: 100 }),
    latitude: real(),
    longitude: real(),

    // CONTACTABILITY (Trestle)
    phoneIsValid: boolean(),
    phoneActivityScore: integer(),
    phoneLineType: varchar({ length: 20 }),
    phoneNameMatch: boolean(),
    phoneContactGrade: varchar({ length: 1 }),
    emailIsValid: boolean(),
    emailContactGrade: varchar({ length: 1 }),
    emailNameMatch: boolean(),
    emailIsDeliverable: boolean(),
    emailAgeScore: integer(),
    addressIsValid: boolean(),
    addressNameMatch: boolean(),

    // COMPLIANCE (CRITICAL)
    isLitigatorRisk: boolean().default(false),
    isDnc: boolean().default(false),
    dncAddedAt: timestamp(),
    dncReason: varchar({ length: 255 }),

    // COMPOSITE SCORES
    overallScore: integer().default(0),
    dataQualityScore: integer().default(0),
    reachabilityScore: integer().default(0),
    intentScore: integer().default(0),
    priorityTier: priorityTierEnum("priority_tier").default("cold"),

    // SOURCE TRACKING
    primarySource: leadSourceEnum("primary_source").notNull(),
    allSources: text().array().default([]),
    sourceFile: varchar({ length: 500 }),
    sourceRecordId: varchar({ length: 100 }),
    importedAt: timestamp(),
    importBatchId: varchar({ length: 50 }),

    // ENRICHMENT STATUS
    skipTraceStatus: varchar({ length: 20 }).default("pending"),
    skipTraceCompletedAt: timestamp(),
    skipTraceResultId: ulidColumn(),
    apolloStatus: varchar({ length: 20 }).default("pending"),
    apolloCompletedAt: timestamp(),
    apolloOrgId: varchar({ length: 50 }),
    trestleStatus: varchar({ length: 20 }).default("pending"),
    trestleCompletedAt: timestamp(),
    enrichmentErrorCount: integer().default(0),
    lastEnrichmentError: text(),
    lastEnrichedAt: timestamp(),

    // TAGS & METADATA
    tags: text().array().default([]),
    labels: jsonb("labels")
      .$type<{ name: string; color: string; category?: string }[]>()
      .default([]),
    customFields: jsonb().$type<Record<string, unknown>>().default({}),
    rawData: jsonb().$type<Record<string, unknown>>(),
    notes: text(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("unified_leads_team_idx").on(t.teamId),
    index("unified_leads_entity_type_idx").on(t.teamId, t.entityType),
    index("unified_leads_phone_idx").on(t.primaryPhone),
    index("unified_leads_team_phone_idx").on(t.teamId, t.primaryPhone),
    index("unified_leads_email_idx").on(t.primaryEmail),
    index("unified_leads_score_idx").on(t.teamId, t.overallScore),
    index("unified_leads_priority_idx").on(t.teamId, t.priorityTier),
    index("unified_leads_geo_idx").on(t.primaryState, t.primaryCity),
    index("unified_leads_zip_idx").on(t.primaryZip),
    index("unified_leads_sic_idx").on(t.sicCode),
    index("unified_leads_sector_idx").on(t.sector),
    index("unified_leads_skiptrace_idx").on(t.teamId, t.skipTraceStatus),
    index("unified_leads_apollo_idx").on(t.teamId, t.apolloStatus),
    index("unified_leads_dnc_idx").on(t.teamId, t.isDnc),
    index("unified_leads_litigator_idx").on(t.isLitigatorRisk),
    index("unified_leads_persona_idx").on(t.personaId),
    index("unified_leads_business_idx").on(t.businessId),
    index("unified_leads_property_idx").on(t.propertyId),
  ]
);

// ============================================================
// LEAD CONTACTS TABLE (1:Many)
// ============================================================

export const leadContacts = pgTable(
  "lead_contacts",
  {
    id: primaryUlid("lcon"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn()
      .references(() => unifiedLeads.id, { onDelete: "cascade" })
      .notNull(),

    contactType: contactTypeEnum("contact_type").notNull(),

    // Phone fields
    phoneNumber: varchar({ length: 20 }),
    normalizedPhone: varchar({ length: 15 }),
    phoneLabel: varchar({ length: 50 }),
    carrier: varchar({ length: 100 }),
    lineType: varchar({ length: 20 }),

    // Email fields
    emailAddress: varchar({ length: 255 }),
    normalizedEmail: varchar({ length: 255 }),
    emailDomain: varchar({ length: 100 }),

    // Address fields
    street: varchar({ length: 255 }),
    street2: varchar({ length: 100 }),
    city: varchar({ length: 100 }),
    state: varchar({ length: 2 }),
    zip: varchar({ length: 10 }),
    zip4: varchar({ length: 4 }),
    county: varchar({ length: 100 }),
    country: varchar({ length: 2 }).default("US"),
    latitude: real(),
    longitude: real(),

    // Contactability
    isValid: boolean().default(true),
    isConnected: boolean(),
    isDeliverable: boolean(),
    activityScore: integer(),
    contactGrade: varchar({ length: 1 }),
    nameMatch: boolean(),
    ageScore: integer(),

    // Compliance
    isDnc: boolean().default(false),
    isOptedOut: boolean().default(false),
    optOutAt: timestamp(),
    optOutReason: varchar({ length: 255 }),

    // Priority & Source
    isPrimary: boolean().default(false),
    priority: integer().default(0),
    source: leadSourceEnum("source").notNull(),
    sourceLabel: varchar({ length: 50 }),
    lastVerifiedAt: timestamp(),
    verificationSource: varchar({ length: 50 }),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("lead_contacts_lead_idx").on(t.leadId),
    index("lead_contacts_team_idx").on(t.teamId),
    index("lead_contacts_phone_idx").on(t.normalizedPhone),
    index("lead_contacts_team_phone_idx").on(t.teamId, t.normalizedPhone),
    index("lead_contacts_email_idx").on(t.normalizedEmail),
    index("lead_contacts_type_idx").on(t.leadId, t.contactType),
    index("lead_contacts_primary_idx").on(t.leadId, t.isPrimary),
    index("lead_contacts_dnc_idx").on(t.isDnc),
    uniqueIndex("lead_contacts_phone_uniq").on(t.leadId, t.normalizedPhone),
    uniqueIndex("lead_contacts_email_uniq").on(t.leadId, t.normalizedEmail),
  ]
);

// ============================================================
// LEAD CAMPAIGN STATE TABLE
// ============================================================

export const leadCampaignState = pgTable(
  "lead_campaign_state",
  {
    id: primaryUlid("lcstate"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn()
      .references(() => unifiedLeads.id, { onDelete: "cascade" })
      .notNull(),
    campaignId: ulidColumn().references(() => campaigns.id, {
      onDelete: "set null",
    }),

    // State machine
    leadState: leadStateCadenceEnum("lead_state").notNull().default("new"),
    previousState: leadStateCadenceEnum("previous_state"),
    stateChangedAt: timestamp(),
    currentStep: integer().notNull().default(1),
    maxSteps: integer().notNull().default(30),

    // Template tracking
    messageTemplateGroupId: ulidColumn(),
    currentTemplateId: ulidColumn(),
    nextTemplateId: ulidColumn(),

    // Next action
    nextAction: varchar({ length: 50 }).default("send_sms"),
    nextActionAt: timestamp(),

    // Attempt tracking
    attemptCount: integer().notNull().default(0),
    maxAttemptsBeforePause: integer().notNull().default(5),
    consecutiveNoResponse: integer().notNull().default(0),

    // Pause state
    isPaused: boolean().notNull().default(false),
    pausedAt: timestamp(),
    pauseReason: varchar({ length: 255 }),
    resumeAt: timestamp(),

    // Contact timestamps
    firstContactAt: timestamp(),
    lastContactAttemptAt: timestamp(),
    lastContactSuccessAt: timestamp(),
    lastResponseAt: timestamp(),
    lastHumanTouchAt: timestamp(),

    // Worker assignment
    assignedWorker: sdrWorkerEnum("assigned_worker"),
    assignedChannel: sdrChannelEnum("assigned_channel").default("sms"),
    assignedPriority: varchar({ length: 10 }).default("medium"),
    assignedAt: timestamp(),
    outboundPhone: varchar({ length: 20 }),

    // Metrics
    totalSmsCount: integer().notNull().default(0),
    totalEmailCount: integer().notNull().default(0),
    totalCallCount: integer().notNull().default(0),
    responseCount: integer().notNull().default(0),
    positiveResponseCount: integer().notNull().default(0),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("lead_campaign_state_lead_idx").on(t.leadId),
    index("lead_campaign_state_team_idx").on(t.teamId),
    index("lead_campaign_state_campaign_idx").on(t.campaignId),
    index("lead_campaign_state_state_idx").on(t.teamId, t.leadState),
    index("lead_campaign_state_next_action_idx").on(t.nextActionAt),
    index("lead_campaign_state_paused_idx").on(t.isPaused, t.resumeAt),
    index("lead_campaign_state_worker_idx").on(
      t.assignedWorker,
      t.assignedPriority
    ),
    uniqueIndex("lead_campaign_state_uniq").on(t.leadId, t.campaignId),
  ]
);

// ============================================================
// LEAD CHANGELOG TABLE
// ============================================================

export const leadChangelog = pgTable(
  "lead_changelog",
  {
    id: primaryUlid("lchg"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn()
      .references(() => unifiedLeads.id, { onDelete: "cascade" })
      .notNull(),

    tableName: varchar({ length: 50 }).notNull(),
    fieldName: varchar({ length: 100 }).notNull(),
    fieldCategory: changelogCategoryEnum("field_category").notNull(),

    oldValue: jsonb().$type<unknown>(),
    newValue: jsonb().$type<unknown>(),
    changeType: varchar({ length: 20 }).notNull(),
    changeReason: varchar({ length: 255 }),

    changedBy: varchar({ length: 100 }).notNull(),
    changedByType: varchar({ length: 20 }).notNull(),
    source: leadSourceEnum("source"),

    relatedContactId: ulidColumn(),
    relatedCampaignStateId: ulidColumn(),

    metadata: jsonb().$type<Record<string, unknown>>(),

    // Immutable - no updatedAt
    createdAt: timestamp().$defaultFn(() => new Date()).notNull(),
  },
  (t) => [
    index("lead_changelog_lead_idx").on(t.leadId),
    index("lead_changelog_team_idx").on(t.teamId),
    index("lead_changelog_created_idx").on(t.createdAt),
    index("lead_changelog_lead_time_idx").on(t.leadId, t.createdAt),
    index("lead_changelog_field_idx").on(t.fieldName),
    index("lead_changelog_category_idx").on(t.fieldCategory),
    index("lead_changelog_changed_by_idx").on(t.changedBy),
    index("lead_changelog_compliance_idx").on(t.fieldCategory, t.fieldName),
  ]
);

// ============================================================
// LEAD TAGS TABLE
// ============================================================

export const leadTagDefinitions = pgTable(
  "lead_tag_definitions",
  {
    id: primaryUlid("ltag"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    name: varchar({ length: 50 }).notNull(),
    color: varchar({ length: 7 }).notNull(), // hex color
    category: varchar({ length: 20 }).default("custom"),
    icon: varchar({ length: 50 }),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("lead_tag_defs_team_idx").on(t.teamId),
    uniqueIndex("lead_tag_defs_name_uniq").on(t.teamId, t.name),
  ]
);

export const leadTagAssignments = pgTable(
  "lead_tag_assignments",
  {
    leadId: ulidColumn()
      .references(() => unifiedLeads.id, { onDelete: "cascade" })
      .notNull(),
    tagId: ulidColumn()
      .references(() => leadTagDefinitions.id, { onDelete: "cascade" })
      .notNull(),
    assignedBy: varchar({ length: 100 }),
    assignedAt: timestamp().$defaultFn(() => new Date()).notNull(),
  },
  (t) => [
    index("lead_tag_assign_lead_idx").on(t.leadId),
    index("lead_tag_assign_tag_idx").on(t.tagId),
    uniqueIndex("lead_tag_assign_uniq").on(t.leadId, t.tagId),
  ]
);

// ============================================================
// SDR ACTIONS TABLE
// ============================================================

export const sdrActions = pgTable(
  "sdr_actions",
  {
    id: primaryUlid("sdra"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn()
      .references(() => unifiedLeads.id, { onDelete: "cascade" })
      .notNull(),
    campaignStateId: ulidColumn().references(() => leadCampaignState.id, {
      onDelete: "set null",
    }),

    actionType: sdrActionEnum("action_type").notNull(),
    executedBy: sdrWorkerEnum("executed_by"),
    templateUsed: text(),

    scheduledAt: timestamp(),
    executedAt: timestamp(),
    status: varchar({ length: 20 }).default("pending"),

    resultType: varchar({ length: 50 }),
    responseClassification: varchar({ length: 50 }),
    providerMessageId: varchar({ length: 100 }),
    errorCode: varchar({ length: 50 }),
    errorMessage: text(),

    metadata: jsonb().$type<Record<string, unknown>>(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("sdr_actions_lead_idx").on(t.leadId),
    index("sdr_actions_team_idx").on(t.teamId),
    index("sdr_actions_scheduled_idx").on(t.scheduledAt),
    index("sdr_actions_status_idx").on(t.status),
    index("sdr_actions_worker_idx").on(t.executedBy),
    index("sdr_actions_type_idx").on(t.actionType),
  ]
);

// ============================================================
// TYPES
// ============================================================

export type UnifiedLead = typeof unifiedLeads.$inferSelect;
export type NewUnifiedLead = typeof unifiedLeads.$inferInsert;

export type LeadContact = typeof leadContacts.$inferSelect;
export type NewLeadContact = typeof leadContacts.$inferInsert;

export type LeadCampaignState = typeof leadCampaignState.$inferSelect;
export type NewLeadCampaignState = typeof leadCampaignState.$inferInsert;

export type LeadChangelog = typeof leadChangelog.$inferSelect;
export type NewLeadChangelog = typeof leadChangelog.$inferInsert;

export type LeadTagDefinition = typeof leadTagDefinitions.$inferSelect;
export type NewLeadTagDefinition = typeof leadTagDefinitions.$inferInsert;

export type LeadTagAssignment = typeof leadTagAssignments.$inferSelect;
export type NewLeadTagAssignment = typeof leadTagAssignments.$inferInsert;

export type SdrAction = typeof sdrActions.$inferSelect;
export type NewSdrAction = typeof sdrActions.$inferInsert;

// ============================================================
// CHANGELOG REQUIRED FIELDS
// ============================================================

export const CHANGELOG_REQUIRED_FIELDS: Record<string, string> = {
  // Identity - ALWAYS log
  firstName: "identity",
  lastName: "identity",
  fullName: "identity",
  companyName: "identity",

  // Contact - ALWAYS log
  primaryPhone: "contact",
  primaryEmail: "contact",

  // Compliance - CRITICAL
  isDnc: "compliance",
  isLitigatorRisk: "compliance",
  dncAddedAt: "compliance",
  dncReason: "compliance",

  // Campaign state - ALWAYS log
  leadState: "campaign",
  currentStep: "campaign",
  isPaused: "campaign",
  pauseReason: "campaign",

  // Score - log if change > 10 points
  overallScore: "score",
  phoneContactGrade: "score",
  emailContactGrade: "score",
};
