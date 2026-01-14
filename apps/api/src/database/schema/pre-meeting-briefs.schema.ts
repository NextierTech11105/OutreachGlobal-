/**
 * PRE-MEETING BRIEFS SCHEMA
 *
 * Growth OS Module: Research Engine - Meeting Prep
 *
 * Purpose:
 * - Generate meeting-specific intelligence briefs
 * - Combine NEVA research with persona insights
 * - Provide talking points and objection handling
 * - Track brief effectiveness
 *
 * Flow:
 * Meeting Scheduled → NEVA Enrichment → Persona Match → Brief Generation → Meeting
 */

import {
  index,
  jsonb,
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  real,
  timestamp,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

// =============================================================================
// PRE-MEETING BRIEFS
// =============================================================================

export const PRE_MEETING_BRIEF_PK = "pmb";

export type BriefStatus =
  | "generating"
  | "ready"
  | "reviewed"
  | "used"
  | "archived";

/**
 * Pre-Meeting Brief - compiled intelligence for meeting prep
 */
export const preMeetingBriefs = pgTable(
  "pre_meeting_briefs",
  {
    id: primaryUlid(PRE_MEETING_BRIEF_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    meetingId: ulidColumn("meeting_id").notNull(),
    leadId: ulidColumn("lead_id"),

    // === Source References ===
    enrichmentId: ulidColumn("enrichment_id"), // NEVA enrichment used
    personaId: ulidColumn("persona_id"), // Buyer persona assigned
    icpId: ulidColumn("icp_id"), // ICP matched

    // === Status ===
    status: varchar({ length: 20 }).default("generating").$type<BriefStatus>(),
    generatedAt: timestamp("generated_at"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedBy: ulidColumn("reviewed_by"),

    // === Executive Summary ===
    executiveSummary: text("executive_summary"),
    meetingObjective: text("meeting_objective"),
    successCriteria: jsonb("success_criteria").$type<string[]>(),

    // === Company Intelligence ===
    companySnapshot: jsonb("company_snapshot").$type<{
      name: string;
      industry: string;
      size: string;
      revenue: string;
      headquarters: string;
      description: string;
      recentNews?: string[];
      keyMetrics?: Record<string, string>;
    }>(),

    // === Contact Intelligence ===
    contactSnapshot: jsonb("contact_snapshot").$type<{
      name: string;
      title: string;
      department: string;
      seniority: string;
      linkedinUrl?: string;
      previousCompanies?: string[];
      commonGround?: string[]; // Shared interests, connections
    }>(),

    // === Persona Insights ===
    personaInsights: jsonb("persona_insights").$type<{
      personaName: string;
      decisionStyle: string;
      emotionalDrivers: string[];
      painPoints: string[];
      communicationPreferences: {
        tone: string;
        pace: string;
        detailLevel: string;
      };
    }>(),

    // === Talking Points ===
    talkingPoints: jsonb("talking_points").$type<{
      opener: string[];
      discoveryQuestions: string[];
      valueProps: string[];
      proofPoints: string[];
      closingQuestions: string[];
    }>(),

    // === Objection Prep ===
    anticipatedObjections: jsonb("anticipated_objections").$type<
      Array<{
        objection: string;
        category: string;
        likelihood: "high" | "medium" | "low";
        rebuttal: string;
        followUp: string;
      }>
    >(),

    // === Buying Signals ===
    buyingSignals: jsonb("buying_signals").$type<
      Array<{
        signal: string;
        source: string;
        confidence: "high" | "medium" | "low";
        implication: string;
      }>
    >(),

    // === Risk Factors ===
    riskFactors: jsonb("risk_factors").$type<
      Array<{
        risk: string;
        severity: "high" | "medium" | "low";
        mitigation: string;
      }>
    >(),

    // === Competitive Intel ===
    competitiveIntel: jsonb("competitive_intel").$type<{
      likelyCompetitors: string[];
      differentiators: string[];
      weakPointsToAvoid: string[];
    }>(),

    // === Action Items ===
    preCallActions: jsonb("pre_call_actions").$type<string[]>(),
    postCallActions: jsonb("post_call_actions").$type<string[]>(),

    // === Effectiveness Tracking ===
    wasUseful: boolean("was_useful"),
    usefulnessRating: integer("usefulness_rating"), // 1-5
    feedbackNotes: text("feedback_notes"),

    // === Metadata ===
    sourceData: jsonb("source_data").$type<{
      nevaJobId?: string;
      apolloData?: boolean;
      perplexityData?: boolean;
      manualInput?: boolean;
    }>(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("pmb_team_idx").on(t.teamId),
    index("pmb_meeting_idx").on(t.meetingId),
    index("pmb_lead_idx").on(t.leadId),
    index("pmb_status_idx").on(t.teamId, t.status),
  ],
);

// =============================================================================
// BRIEF TEMPLATES
// =============================================================================

export const BRIEF_TEMPLATE_PK = "brt";

/**
 * Brief Templates - customizable brief structures per team
 */
export const briefTemplates = pgTable(
  "brief_templates",
  {
    id: primaryUlid(BRIEF_TEMPLATE_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    name: varchar({ length: 255 }).notNull(),
    description: text(),
    isActive: boolean("is_active").default(true),
    isDefault: boolean("is_default").default(false),

    // === Which meeting types this applies to ===
    meetingTypes: jsonb("meeting_types").$type<string[]>(), // ['discovery_15', 'strategy_45', etc.]

    // === Section Configuration ===
    sections: jsonb("sections").$type<
      Array<{
        id: string;
        name: string;
        enabled: boolean;
        order: number;
        promptOverride?: string; // Custom prompt for AI generation
      }>
    >(),

    // === Generation Settings ===
    aiModel: varchar("ai_model", { length: 50 }).default("gpt-4"),
    temperature: real().default(0.7),
    maxTokens: integer("max_tokens").default(2000),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("brt_team_idx").on(t.teamId),
    index("brt_active_idx").on(t.teamId, t.isActive),
  ],
);

// =============================================================================
// RESEARCH REQUESTS (On-Demand Deep Dive)
// =============================================================================

export const RESEARCH_REQUEST_PK = "rsr";

export type ResearchRequestStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";
export type ResearchRequestType =
  | "company"
  | "contact"
  | "industry"
  | "competitor";

/**
 * Research Requests - on-demand research for meetings
 */
export const researchRequests = pgTable(
  "research_requests",
  {
    id: primaryUlid(RESEARCH_REQUEST_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    meetingId: ulidColumn("meeting_id"),
    briefId: ulidColumn("brief_id"),
    requestedBy: ulidColumn("requested_by"),

    // === Request Details ===
    type: varchar({ length: 50 }).notNull().$type<ResearchRequestType>(),
    target: varchar({ length: 500 }).notNull(), // Company name, person name, etc.
    questions: jsonb("questions").$type<string[]>(), // Specific questions to answer
    context: text(), // Additional context for research

    // === Status ===
    status: varchar({ length: 20 })
      .default("pending")
      .$type<ResearchRequestStatus>(),
    progress: integer().default(0), // 0-100

    // === Results ===
    findings: jsonb("findings").$type<{
      summary: string;
      details: Record<string, unknown>;
      sources: string[];
      confidence: number;
    }>(),

    // === Timing ===
    requestedAt: timestamp("requested_at").defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),

    // === Error Handling ===
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("rsr_team_idx").on(t.teamId),
    index("rsr_meeting_idx").on(t.meetingId),
    index("rsr_brief_idx").on(t.briefId),
    index("rsr_status_idx").on(t.status),
  ],
);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PreMeetingBrief = typeof preMeetingBriefs.$inferSelect;
export type NewPreMeetingBrief = typeof preMeetingBriefs.$inferInsert;

export type BriefTemplate = typeof briefTemplates.$inferSelect;
export type NewBriefTemplate = typeof briefTemplates.$inferInsert;

export type ResearchRequest = typeof researchRequests.$inferSelect;
export type NewResearchRequest = typeof researchRequests.$inferInsert;

// =============================================================================
// DEFAULT BRIEF SECTIONS
// =============================================================================

export const DEFAULT_BRIEF_SECTIONS = [
  {
    id: "executive_summary",
    name: "Executive Summary",
    enabled: true,
    order: 1,
  },
  { id: "company_snapshot", name: "Company Snapshot", enabled: true, order: 2 },
  {
    id: "contact_snapshot",
    name: "Contact Intelligence",
    enabled: true,
    order: 3,
  },
  { id: "persona_insights", name: "Persona Insights", enabled: true, order: 4 },
  { id: "talking_points", name: "Talking Points", enabled: true, order: 5 },
  {
    id: "anticipated_objections",
    name: "Objection Prep",
    enabled: true,
    order: 6,
  },
  { id: "buying_signals", name: "Buying Signals", enabled: true, order: 7 },
  {
    id: "competitive_intel",
    name: "Competitive Intel",
    enabled: true,
    order: 8,
  },
  { id: "risk_factors", name: "Risk Factors", enabled: false, order: 9 },
  { id: "action_items", name: "Action Items", enabled: true, order: 10 },
];

// =============================================================================
// BRIEF GENERATION HELPERS
// =============================================================================

/**
 * Sections that require NEVA enrichment data
 */
export const SECTIONS_REQUIRING_ENRICHMENT = [
  "company_snapshot",
  "contact_snapshot",
  "buying_signals",
  "competitive_intel",
];

/**
 * Sections that require persona assignment
 */
export const SECTIONS_REQUIRING_PERSONA = [
  "persona_insights",
  "talking_points",
  "anticipated_objections",
];

/**
 * Check if a brief can be generated with available data
 */
export function canGenerateBrief(
  hasEnrichment: boolean,
  hasPersona: boolean,
  requestedSections: string[],
): { canGenerate: boolean; missingSections: string[] } {
  const missingSections: string[] = [];

  for (const section of requestedSections) {
    if (SECTIONS_REQUIRING_ENRICHMENT.includes(section) && !hasEnrichment) {
      missingSections.push(section);
    }
    if (SECTIONS_REQUIRING_PERSONA.includes(section) && !hasPersona) {
      missingSections.push(section);
    }
  }

  return {
    canGenerate: missingSections.length === 0,
    missingSections,
  };
}
