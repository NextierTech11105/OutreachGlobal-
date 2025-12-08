/**
 * Unified Lead Card Schema
 * Final consolidated lead cards for campaigns
 */
import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  timestamp,
  varchar,
  boolean,
  text,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { personasRef } from "./persona.schema";
import { businessesRef } from "./business-owner.schema";
import { properties } from "./properties.schema";

export const UNIFIED_LEAD_CARD_PK = "ulc";

export const unifiedLeadCards = pgTable(
  "unified_lead_cards",
  {
    id: primaryUlid(UNIFIED_LEAD_CARD_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    personaId: personasRef({ onDelete: "cascade" }).notNull(),
    // Associated entities
    businessId: businessesRef({ onDelete: "set null" }),
    propertyId: ulidColumn().references(() => properties.id, { onDelete: "set null" }),
    // Denormalized identity (for quick access)
    firstName: varchar().notNull(),
    lastName: varchar().notNull(),
    fullName: varchar().notNull(),
    // Best contact info (denormalized)
    primaryPhone: varchar(),
    primaryPhoneType: varchar(),
    primaryEmail: varchar(),
    primaryEmailType: varchar(),
    // Location
    city: varchar(),
    state: varchar(),
    zip: varchar(),
    // Role
    title: varchar(),
    roleType: varchar().notNull().default("unknown"),
    isDecisionMaker: boolean().notNull().default(false),
    // Scoring (0-100 each)
    totalScore: integer().notNull().default(0),
    dataQualityScore: integer().notNull().default(0),
    contactReachabilityScore: integer().notNull().default(0),
    roleValueScore: integer().notNull().default(0),
    propertyOpportunityScore: integer().notNull().default(0),
    businessFitScore: integer().notNull().default(0),
    // Score breakdown (JSON for flexibility)
    scoreBreakdown: jsonb().$type<{
      hasPhone: boolean;
      hasMobilePhone: boolean;
      hasEmail: boolean;
      hasValidEmail: boolean;
      hasAddress: boolean;
      hasCurrentAddress: boolean;
      hasSocial: boolean;
      hasLinkedIn: boolean;
      roleWeight: number;
      distressSignalCount: number;
      equityLevel: number;
    }>(),
    // Campaign assignment
    assignedAgent: varchar(), // 'sabrina' | 'gianna'
    assignedChannel: varchar(), // 'sms' | 'email' | 'call'
    assignedPriority: varchar(), // 'high' | 'medium' | 'low'
    campaignTemplateId: varchar(),
    campaignReason: varchar(),
    assignedAt: timestamp(),
    // Lead status
    status: varchar().notNull().default("new"), // 'new' | 'enriching' | 'ready' | 'contacted' | 'responded' | 'qualified' | 'converted' | 'dead'
    statusChangedAt: timestamp(),
    // Enrichment status
    enrichmentStatus: varchar().notNull().default("pending"), // 'pending' | 'in_progress' | 'completed' | 'failed'
    skipTraceStatus: varchar().notNull().default("pending"),
    apolloStatus: varchar().notNull().default("pending"),
    propertyDetailStatus: varchar().notNull().default("skipped"),
    enrichmentErrorCount: integer().notNull().default(0),
    lastEnrichmentError: varchar(),
    // Activity tracking
    lastActivityAt: timestamp(),
    lastContactedAt: timestamp(),
    lastResponseAt: timestamp(),
    contactAttempts: integer().notNull().default(0),
    // Tags
    tags: text().array(),
    // Notes
    notes: text(),
    // Source tracking
    sources: text().array().notNull().default([]),
    primarySource: varchar().notNull(), // 'business' | 'property' | 'consumer' | 'apollo' | 'skiptrace'
    // Raw data paths (for drill-down)
    rawDataPaths: text().array(),
    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.personaId),
    index().on(t.businessId),
    index().on(t.propertyId),
    index().on(t.totalScore),
    index().on(t.status),
    index().on(t.assignedAgent),
    index().on(t.assignedPriority),
    index().on(t.enrichmentStatus),
    index().on(t.roleType),
    index().on(t.isDecisionMaker),
    index().on(t.createdAt),
    index().on(t.lastActivityAt),
  ]
);

export const unifiedLeadCardsRef = (config?: { onDelete?: "cascade" | "set null" }) =>
  ulidColumn().references(() => unifiedLeadCards.id, config);

// Lead activity tracking
export const leadActivities = pgTable(
  "lead_activities",
  {
    id: primaryUlid("lact"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadCardId: unifiedLeadCardsRef({ onDelete: "cascade" }).notNull(),
    // Activity details
    activityType: varchar().notNull(), // 'sms_sent' | 'sms_received' | 'email_sent' | 'email_received' | 'call_made' | 'call_received' | 'note_added' | 'status_changed'
    agent: varchar(), // 'sabrina' | 'gianna' | user ID
    channel: varchar(), // 'sms' | 'email' | 'call'
    // Content
    subject: varchar(),
    content: text(),
    // Metadata
    metadata: jsonb().$type<Record<string, unknown>>(),
    // External references
    externalId: varchar(), // Message ID, call SID, etc.
    // Timestamps
    createdAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.leadCardId),
    index().on(t.activityType),
    index().on(t.createdAt),
  ]
);

// Campaign queue for scheduled outreach
export const campaignQueue = pgTable(
  "campaign_queue",
  {
    id: primaryUlid("cq"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadCardId: unifiedLeadCardsRef({ onDelete: "cascade" }).notNull(),
    // Assignment
    agent: varchar().notNull(), // 'sabrina' | 'gianna'
    channel: varchar().notNull(), // 'sms' | 'email'
    priority: integer().notNull().default(50), // 0-100, higher = more urgent
    // Template
    templateId: varchar(),
    templateOverride: text(),
    // Scheduling
    scheduledAt: timestamp(),
    processAfter: timestamp(), // For rate limiting
    // Status
    status: varchar().notNull().default("pending"), // 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
    attempts: integer().notNull().default(0),
    maxAttempts: integer().notNull().default(3),
    lastAttemptAt: timestamp(),
    lastError: varchar(),
    // Result
    sentAt: timestamp(),
    externalId: varchar(), // Message SID, email ID, etc.
    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.leadCardId),
    index().on(t.status),
    index().on(t.agent),
    index().on(t.priority),
    index().on(t.scheduledAt),
    index().on(t.processAfter),
  ]
);
