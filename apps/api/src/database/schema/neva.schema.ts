/**
 * NEVA AGENT SCHEMA
 * =================
 * Deep research & enrichment agent - Perplexity-powered intelligence
 *
 * Triggered on:
 * - Initial SMS (pre-campaign enrichment)
 * - Monthly Refresh (keep intel fresh)
 * - Manual (user-requested deep dive)
 * - Stage Change (lead progresses in funnel)
 * - Signal Detected (buying signal triggers research)
 */

import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teams, teamsRef } from "./teams.schema";
import { leads } from "./leads.schema";

// Primary key prefixes
export const NEVA_RESEARCH_JOB_PK = "nrj";
export const NEVA_ENRICHMENT_PK = "nen";
export const NEVA_PERSONA_PK = "nps";
export const NEVA_MARKET_DATA_PK = "nmd";
export const NEVA_CITATION_PK = "nct";

// ============================================
// ENUMS
// ============================================

export type NevaResearchType =
  | "full" // Complete research package
  | "quick" // Fast overview
  | "market_only" // TAM/SAM/SOM focus
  | "persona_only" // Buyer persona focus
  | "deal_intel" // Deal-specific intelligence
  | "enrichment"; // Apollo-style enrichment

export type NevaResearchStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "partial"
  | "failed";

export type NevaResearchDepth = "basic" | "standard" | "deep";

export type NevaEnrichmentTrigger =
  | "initial_sms" // Pre-campaign enrichment
  | "monthly_refresh" // Keep intel fresh
  | "manual" // User-requested
  | "stage_change" // Lead progresses in funnel
  | "signal_detected"; // Buying signal triggers research

export type NevaTargetType = "company" | "industry" | "lead" | "person";

// ============================================
// NEVA RESEARCH JOBS
// Deep research requests (TAM/SAM, personas, deal intel)
// ============================================

export interface NevaExecutiveSummary {
  overview: string;
  keyFindings: string[];
  recommendations: string[];
  riskFactors?: string[];
  opportunityScore?: number;
}

export interface NevaFocusArea {
  area: string;
  priority: "high" | "medium" | "low";
  completed?: boolean;
}

export const nevaResearchJobs = pgTable(
  "neva_research_jobs",
  {
    id: primaryUlid(NEVA_RESEARCH_JOB_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Research target
    target: text().notNull(), // Company name, industry, etc.
    targetType: varchar("target_type").notNull().$type<NevaTargetType>(),
    leadId: ulidColumn("lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),

    // Configuration
    researchType: varchar("research_type")
      .$type<NevaResearchType>()
      .default("full"),
    depth: varchar().$type<NevaResearchDepth>().default("standard"),
    focusAreas: jsonb("focus_areas").$type<NevaFocusArea[]>().default([]),

    // Status
    status: varchar().$type<NevaResearchStatus>().default("queued"),
    progress: integer().default(0), // 0-100

    // Results
    executiveSummary: jsonb("executive_summary").$type<NevaExecutiveSummary>(),
    rawData: jsonb("raw_data"),

    // Timing
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt,
    updatedAt,

    // Error handling
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),
  },
  (t) => [
    index("neva_jobs_team_idx").on(t.teamId),
    index("neva_jobs_status_idx").on(t.status),
    index("neva_jobs_lead_idx").on(t.leadId),
    index("neva_jobs_created_idx").on(t.createdAt),
  ]
);

// ============================================
// NEVA ENRICHMENTS (Apollo.io Clone)
// Perplexity-powered company/person intel
// ============================================

export interface NevaCompanyIntel {
  name: string;
  domain?: string;
  founded?: string;
  size?: string; // "51-200"
  employeeCount?: number;
  revenue?: string; // "$10M-$50M"
  industry?: string;
  subIndustry?: string;
  description?: string;
  headquarters?: { city: string; state: string; country?: string };
  linkedinUrl?: string;
  techStack?: string[];
  fundingStage?: string;
  totalFunding?: string;
  recentNews?: Array<{ title: string; date: string; summary: string }>;
  buyingSignals?: string[];
  keyPeople?: Array<{ name: string; title: string; linkedin?: string }>;
}

export interface NevaPersonIntel {
  name: string;
  title?: string;
  seniority?: string; // "c-level", "vp", "director", "manager", "individual"
  department?: string;
  linkedinUrl?: string;
  bio?: string;
  previousCompanies?: string[];
  decisionMaker?: boolean;
  influencer?: boolean;
  contactStrategy?: {
    bestApproach: string;
    topics: string[];
    avoid?: string[];
  };
}

export interface NevaRealtimeContext {
  lastUpdated: string;
  companyStatus?: { operational: boolean; majorChanges: string[] };
  recentNews?: Array<{ title: string; date: string; summary: string }>;
  marketSignals?: { hiring?: boolean; expansion?: string[] };
  buyingSignals?: Array<{ signal: string; confidence: "high" | "medium" | "low" }>;
  riskFactors?: string[];
  opportunities?: string[];
  recommendedAction?: string;
}

export const nevaEnrichments = pgTable(
  "neva_enrichments",
  {
    id: primaryUlid(NEVA_ENRICHMENT_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn("lead_id")
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),

    // What triggered this enrichment
    trigger: varchar().notNull().$type<NevaEnrichmentTrigger>(),

    // Company Intelligence
    companyIntel: jsonb("company_intel").$type<NevaCompanyIntel>(),

    // Person Intelligence
    personIntel: jsonb("person_intel").$type<NevaPersonIntel>(),

    // Real-time Context (from monthly refresh)
    realtimeContext: jsonb("realtime_context").$type<NevaRealtimeContext>(),

    // Scoring
    enrichmentScore: integer("enrichment_score"), // 0-100
    confidenceScore: integer("confidence_score"), // 0-100

    // Timing
    enrichedAt: timestamp("enriched_at").$defaultFn(() => new Date()),
    expiresAt: timestamp("expires_at"), // For scheduling monthly refresh
    createdAt,
    updatedAt,
  },
  (t) => [
    index("neva_enrichments_lead_idx").on(t.leadId),
    index("neva_enrichments_team_idx").on(t.teamId),
    index("neva_enrichments_expires_idx").on(t.expiresAt),
    index("neva_enrichments_score_idx").on(t.enrichmentScore),
    // Ensure one active enrichment per lead per trigger type
    unique("neva_enrichments_lead_trigger_unique").on(t.leadId, t.trigger),
  ]
);

// ============================================
// NEVA PERSONAS
// Buyer personas generated from market research
// ============================================

export interface NevaPersonaDemographics {
  ageRange?: string;
  gender?: string;
  location?: string;
  income?: string;
}

export interface NevaPersonaPsychographics {
  values?: string[];
  motivations?: string[];
  frustrations?: string[];
}

export interface NevaPersonaProfessional {
  role?: string;
  seniority?: string;
  companySize?: string;
  responsibilities?: string[];
}

export interface NevaPersonaBuyingBehavior {
  researchProcess?: string;
  decisionCriteria?: string[];
  objections?: string[];
  triggers?: string[];
}

export const nevaPersonas = pgTable(
  "neva_personas",
  {
    id: primaryUlid(NEVA_PERSONA_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    researchJobId: ulidColumn("research_job_id").references(
      () => nevaResearchJobs.id,
      { onDelete: "cascade" }
    ),

    // Persona identity
    title: text().notNull(), // e.g., "The Overwhelmed Owner"
    industry: text(),

    // Demographics
    demographics: jsonb().$type<NevaPersonaDemographics>(),

    // Psychographics
    psychographics: jsonb().$type<NevaPersonaPsychographics>(),

    // Professional profile
    professional: jsonb().$type<NevaPersonaProfessional>(),

    // Pain & Goals
    painPoints: jsonb("pain_points").$type<string[]>(),
    goals: jsonb().$type<string[]>(),

    // Buying behavior
    buyingBehavior: jsonb("buying_behavior").$type<NevaPersonaBuyingBehavior>(),

    // Messaging guidance
    messagingAngles: jsonb("messaging_angles").$type<string[]>(),
    contentPreferences: jsonb("content_preferences").$type<string[]>(),

    createdAt,
  },
  (t) => [
    index("neva_personas_team_idx").on(t.teamId),
    index("neva_personas_job_idx").on(t.researchJobId),
    index("neva_personas_industry_idx").on(t.industry),
  ]
);

// ============================================
// NEVA MARKET DATA
// TAM/SAM/SOM and competitive landscape
// ============================================

export interface NevaMarketSize {
  value: string;
  methodology?: string;
  sources?: string[];
  segments?: string[];
  assumptions?: string[];
}

export interface NevaCompetitor {
  name: string;
  marketShare?: string;
  strengths?: string[];
  weaknesses?: string[];
  positioning?: string;
}

export const nevaMarketData = pgTable(
  "neva_market_data",
  {
    id: primaryUlid(NEVA_MARKET_DATA_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    researchJobId: ulidColumn("research_job_id").references(
      () => nevaResearchJobs.id,
      { onDelete: "cascade" }
    ),

    // Market definition
    industry: text().notNull(),
    geography: text().default("United States"),

    // TAM/SAM/SOM
    tam: jsonb().$type<NevaMarketSize>(),
    sam: jsonb().$type<NevaMarketSize>(),
    som: jsonb().$type<NevaMarketSize>(),

    // Growth
    growthRate: text("growth_rate"),
    cagr: text(),

    // Competitive landscape
    competitors: jsonb().$type<NevaCompetitor[]>(),

    // Trends & drivers
    trends: jsonb().$type<string[]>(),
    drivers: jsonb().$type<string[]>(),
    challenges: jsonb().$type<string[]>(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("neva_market_team_idx").on(t.teamId),
    index("neva_market_industry_idx").on(t.industry),
  ]
);

// ============================================
// NEVA CITATIONS
// Source tracking for all research data
// ============================================

export type NevaCitationCategory =
  | "financial"
  | "news"
  | "company"
  | "market"
  | "social"
  | "government";

export const nevaCitations = pgTable(
  "neva_citations",
  {
    id: primaryUlid(NEVA_CITATION_PK),
    researchJobId: ulidColumn("research_job_id").references(
      () => nevaResearchJobs.id,
      { onDelete: "cascade" }
    ),
    enrichmentId: ulidColumn("enrichment_id").references(
      () => nevaEnrichments.id,
      { onDelete: "cascade" }
    ),

    // Citation details
    url: text().notNull(),
    title: text(),
    source: text(), // "SEC", "LinkedIn", "News", etc.
    publishedAt: timestamp("published_at"),
    accessedAt: timestamp("accessed_at").$defaultFn(() => new Date()),

    // Content
    snippet: text(),
    relevance: integer(), // 0-100

    // Category
    category: varchar().$type<NevaCitationCategory>(),

    createdAt,
  },
  (t) => [
    index("neva_citations_job_idx").on(t.researchJobId),
    index("neva_citations_enrichment_idx").on(t.enrichmentId),
  ]
);

// ============================================
// RELATIONS
// ============================================

export const nevaResearchJobsRelations = relations(
  nevaResearchJobs,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [nevaResearchJobs.teamId],
      references: [teams.id],
    }),
    lead: one(leads, {
      fields: [nevaResearchJobs.leadId],
      references: [leads.id],
    }),
    personas: many(nevaPersonas),
    marketData: many(nevaMarketData),
    citations: many(nevaCitations),
  })
);

export const nevaEnrichmentsRelations = relations(
  nevaEnrichments,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [nevaEnrichments.teamId],
      references: [teams.id],
    }),
    lead: one(leads, {
      fields: [nevaEnrichments.leadId],
      references: [leads.id],
    }),
    citations: many(nevaCitations),
  })
);

export const nevaPersonasRelations = relations(nevaPersonas, ({ one }) => ({
  team: one(teams, {
    fields: [nevaPersonas.teamId],
    references: [teams.id],
  }),
  researchJob: one(nevaResearchJobs, {
    fields: [nevaPersonas.researchJobId],
    references: [nevaResearchJobs.id],
  }),
}));

export const nevaMarketDataRelations = relations(nevaMarketData, ({ one }) => ({
  team: one(teams, {
    fields: [nevaMarketData.teamId],
    references: [teams.id],
  }),
  researchJob: one(nevaResearchJobs, {
    fields: [nevaMarketData.researchJobId],
    references: [nevaResearchJobs.id],
  }),
}));

export const nevaCitationsRelations = relations(nevaCitations, ({ one }) => ({
  researchJob: one(nevaResearchJobs, {
    fields: [nevaCitations.researchJobId],
    references: [nevaResearchJobs.id],
  }),
  enrichment: one(nevaEnrichments, {
    fields: [nevaCitations.enrichmentId],
    references: [nevaEnrichments.id],
  }),
}));

// ============================================
// TYPE EXPORTS
// ============================================

export type NevaResearchJob = typeof nevaResearchJobs.$inferSelect;
export type NewNevaResearchJob = typeof nevaResearchJobs.$inferInsert;

export type NevaEnrichment = typeof nevaEnrichments.$inferSelect;
export type NewNevaEnrichment = typeof nevaEnrichments.$inferInsert;

export type NevaPersona = typeof nevaPersonas.$inferSelect;
export type NewNevaPersona = typeof nevaPersonas.$inferInsert;

export type NevaMarketData = typeof nevaMarketData.$inferSelect;
export type NewNevaMarketData = typeof nevaMarketData.$inferInsert;

export type NevaCitation = typeof nevaCitations.$inferSelect;
export type NewNevaCitation = typeof nevaCitations.$inferInsert;
