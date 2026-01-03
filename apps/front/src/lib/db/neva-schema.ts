/**
 * NEVA Schema for Front-end
 *
 * Simplified version of the API's neva.schema.ts for front-end use.
 * Matches the same table structure so data can be inserted/read.
 */

import { pgTable, text, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";

// ============================================
// NEVA RESEARCH JOBS
// ============================================

export const nevaResearchJobs = pgTable(
  "neva_research_jobs",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull(),

    // Research target
    target: text("target").notNull(),
    targetType: text("target_type").notNull(), // 'company' | 'industry' | 'lead' | 'person'
    leadId: text("lead_id"),

    // Configuration
    researchType: text("research_type").default("full"),
    depth: text("depth").default("standard"),
    focusAreas: jsonb("focus_areas").default([]),

    // Status
    status: text("status").default("queued"),
    progress: integer("progress").default(0),

    // Results
    executiveSummary: jsonb("executive_summary"),
    rawData: jsonb("raw_data"),

    // Timing
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

    // Error handling
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),
  },
  (t) => [
    index("neva_jobs_team_idx").on(t.teamId),
    index("neva_jobs_status_idx").on(t.status),
    index("neva_jobs_lead_idx").on(t.leadId),
  ],
);

// ============================================
// NEVA ENRICHMENTS
// ============================================

export const nevaEnrichments = pgTable(
  "neva_enrichments",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull(),
    leadId: text("lead_id").notNull(),

    // What triggered this enrichment
    trigger: text("trigger").notNull(), // 'initial_sms' | 'monthly_refresh' | 'manual' | 'stage_change' | 'signal_detected'

    // Company Intelligence
    companyIntel: jsonb("company_intel"),

    // Person Intelligence
    personIntel: jsonb("person_intel"),

    // Real-time Context
    realtimeContext: jsonb("realtime_context"),

    // Scoring
    enrichmentScore: integer("enrichment_score"),
    confidenceScore: integer("confidence_score"),

    // Timing
    enrichedAt: timestamp("enriched_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("neva_enrichments_lead_idx").on(t.leadId),
    index("neva_enrichments_team_idx").on(t.teamId),
    index("neva_enrichments_expires_idx").on(t.expiresAt),
  ],
);

// Type exports
export type NevaResearchJob = typeof nevaResearchJobs.$inferSelect;
export type NewNevaResearchJob = typeof nevaResearchJobs.$inferInsert;
export type NevaEnrichment = typeof nevaEnrichments.$inferSelect;
export type NewNevaEnrichment = typeof nevaEnrichments.$inferInsert;
