/**
 * TARGETING CATEGORIES SCHEMA (Vertical-Agnostic)
 * ================================================
 *
 * DESIGN PRINCIPLES:
 * 1. AGNOSTIC: Works for any vertical (B2B, real estate, etc.)
 * 2. INTENTIONAL: Every field drives a decision
 * 3. CONTEXTUAL: Maximum signal-to-noise ratio
 * 4. PROBABILISTIC: Scores based on conversion likelihood
 * 5. PROFITABLE: Optimized for $/minute return
 *
 * PRIORITIZATION ENGINE:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  INBOUND RESPONSES (HIGHEST PRIORITY)                      │
 * │  → Already engaged, highest conversion probability         │
 * │  → Process within seconds, not minutes                     │
 * ├─────────────────────────────────────────────────────────────┤
 * │  HIGH-INTENT SIGNALS                                        │
 * │  → Matching keywords, behaviors, timing signals            │
 * │  → Queue for immediate human review or auto-respond        │
 * ├─────────────────────────────────────────────────────────────┤
 * │  WARM RETARGETING                                           │
 * │  → Previous contact, no conversion yet                     │
 * │  → Timed follow-up sequences                               │
 * ├─────────────────────────────────────────────────────────────┤
 * │  COLD CAMPAIGNS (OUTER BAND)                                │
 * │  → New outreach, untouched leads                           │
 * │  → Lower priority, volume-based                            │
 * └─────────────────────────────────────────────────────────────┘
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teams, teamsRef } from "./teams.schema";

// =============================================================================
// PRIMARY KEY PREFIXES
// =============================================================================
export const TARGETING_CATEGORY_PK = "tcat";
export const INDUSTRY_CODE_PK = "icode";
export const DATA_SOURCE_PK = "dsrc";
export const CONSENT_LOG_PK = "consent";
export const PRIORITY_QUEUE_PK = "pq";

// =============================================================================
// ENUMS (Vertical-Agnostic)
// =============================================================================

/**
 * Response Priority Tiers (Inbound → Outbound)
 * Manufacturing inbound responses systematically
 */
export type PriorityTier =
  | "critical"      // Inbound response - process within 30 seconds
  | "high_intent"   // Buying signals detected - process within 5 minutes
  | "warm"          // Previous engagement - process within 1 hour
  | "scheduled"     // Timed sequences - process at scheduled time
  | "cold"          // New outreach - batch process
  | "suppressed";   // Do not contact

/**
 * Value Tiers (Profitability Segmentation)
 */
export type ValueTier =
  | "premium"       // High $ per minute potential (>$10/min)
  | "standard"      // Normal $ per minute ($2-10/min)
  | "volume"        // Low margin, high volume (<$2/min)
  | "nurture";      // Long-term value, low immediate $

/**
 * Industry Classification Standard
 * Agnostic to any classification system (SIC, NAICS, custom)
 */
export type ClassificationSystem =
  | "sic"           // Standard Industrial Classification
  | "naics"         // North American Industry Classification
  | "custom"        // User-defined categories
  | "mixed";        // Multiple systems

/**
 * Source Provider Types
 */
export type DataProvider =
  | "usbizdata"     // USBizData.com
  | "apollo"        // Apollo.io
  | "zoominfo"      // ZoomInfo
  | "realestateapi" // RealEstateAPI (skip trace)
  | "manual"        // Manual import
  | "webhook"       // Inbound webhook
  | "scrape";       // Web scraping

// =============================================================================
// TARGETING CATEGORIES TABLE
// =============================================================================

/**
 * Targeting Categories
 *
 * Vertical-agnostic categorization for prioritization and messaging.
 * Can represent SIC categories, property types, persona segments, etc.
 */
export const targetingCategories = pgTable(
  "targeting_categories",
  {
    id: primaryUlid(TARGETING_CATEGORY_PK),
    teamId: teamsRef({ onDelete: "cascade" }),

    // === IDENTITY ===
    name: varchar().notNull(),
    slug: varchar().notNull(),
    description: text(),

    // === CLASSIFICATION ===
    classificationSystem: varchar("classification_system")
      .$type<ClassificationSystem>()
      .notNull()
      .default("custom"),
    parentCategoryId: ulidColumn("parent_category_id"), // For hierarchies

    // === PRIORITIZATION ENGINE ===
    priorityTier: varchar("priority_tier")
      .$type<PriorityTier>()
      .notNull()
      .default("cold"),
    valueTier: varchar("value_tier")
      .$type<ValueTier>()
      .notNull()
      .default("standard"),

    // === PROFITABILITY METRICS ===
    avgDealValue: integer("avg_deal_value"),          // Average deal $ value
    avgConversionRate: real("avg_conversion_rate"),   // 0.0-1.0
    avgTimeToClose: integer("avg_time_to_close"),     // Days
    dollarPerMinute: real("dollar_per_minute"),       // Calculated: value × rate / time

    // === PROBABILITY WEIGHTS (for scoring) ===
    intentWeight: real("intent_weight").notNull().default(1.0),
    engagementWeight: real("engagement_weight").notNull().default(1.0),
    recencyWeight: real("recency_weight").notNull().default(1.0),
    fitWeight: real("fit_weight").notNull().default(1.0),

    // === OWNERSHIP CORRELATION ===
    propertyOwnershipLikelihood: real("property_ownership_likelihood"), // 0.0-1.0: likelihood owner also owns property
    businessPropertyCorrelation: boolean("business_property_correlation").default(false), // Cross-sell opportunity

    // === RESEARCH PROMPTS (for Neva/AI) ===
    researchPromptTemplate: text("research_prompt_template"),
    qualificationPrompt: text("qualification_prompt"),

    // === REVENUE TARGETING ===
    minRevenue: integer("min_revenue"),
    maxRevenue: integer("max_revenue"),
    typicalMultiple: varchar("typical_multiple"),

    // === METADATA ===
    metadata: jsonb().$type<Record<string, unknown>>(),
    isActive: boolean("is_active").notNull().default(true),
    isGlobal: boolean("is_global").notNull().default(false), // Available to all teams
    sortOrder: integer("sort_order").notNull().default(0),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("targeting_cat_team_idx").on(t.teamId),
    index("targeting_cat_priority_idx").on(t.priorityTier),
    index("targeting_cat_value_idx").on(t.valueTier),
    index("targeting_cat_active_idx").on(t.isActive),
    uniqueIndex("targeting_cat_slug_idx").on(t.teamId, t.slug),
  ],
);

// =============================================================================
// INDUSTRY CODES TABLE
// =============================================================================

/**
 * Industry Codes
 *
 * Individual classification codes (SIC, NAICS, custom) with counts and targeting metadata.
 * Build-on-demand compatible with USBizData and other providers.
 */
export const industryCodes = pgTable(
  "industry_codes",
  {
    id: primaryUlid(INDUSTRY_CODE_PK),
    categoryId: ulidColumn("category_id")
      .references(() => targetingCategories.id, { onDelete: "set null" }),

    // === CLASSIFICATION ===
    system: varchar().$type<ClassificationSystem>().notNull().default("sic"),
    code: varchar().notNull(),              // e.g., "8721" for SIC
    description: varchar().notNull(),

    // === COUNTS (Build on Demand) ===
    totalCount: integer("total_count").notNull().default(0),
    qualifiedCount: integer("qualified_count").notNull().default(0),
    countLastUpdated: timestamp("count_last_updated"),

    // === TARGETING METRICS ===
    avgMultiple: real("avg_multiple"),             // Exit multiple for brokers
    exitFrequency: varchar("exit_frequency"),      // 'high' | 'medium' | 'low'
    seasonality: varchar(),                        // 'q1' | 'q4' | 'none'

    // === RESEARCH PROMPTS ===
    companyIntelPrompt: text("company_intel_prompt"),
    ownerBackgroundPrompt: text("owner_background_prompt"),

    // === METADATA ===
    aliases: text().array(),                       // Alternative names
    relatedCodes: text("related_codes").array(),   // Cross-reference codes
    isActive: boolean("is_active").notNull().default(true),
    priority: integer().notNull().default(0),      // Higher = target first

    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("industry_codes_system_code_idx").on(t.system, t.code),
    index("industry_codes_category_idx").on(t.categoryId),
    index("industry_codes_priority_idx").on(t.priority),
  ],
);

// =============================================================================
// DATA SOURCES TABLE
// =============================================================================

/**
 * Data Sources
 *
 * Tracks data imports from USBizData, Apollo, and other providers.
 * Supports build-on-demand ordering and ingestion tracking.
 */
export const dataSources = pgTable(
  "data_sources",
  {
    id: primaryUlid(DATA_SOURCE_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // === SOURCE IDENTITY ===
    name: varchar().notNull(),
    provider: varchar().$type<DataProvider>().notNull().default("manual"),
    sourceType: varchar("source_type").notNull(), // 'industry_segment' | 'specialty_list' | 'custom'

    // === FILTERING CRITERIA ===
    industryCodes: text("industry_codes").array(),
    stateFilters: text("state_filters").array(),
    cityFilters: text("city_filters").array(),
    revenueMin: integer("revenue_min"),
    revenueMax: integer("revenue_max"),
    employeeMin: integer("employee_min"),
    employeeMax: integer("employee_max"),
    additionalFilters: jsonb("additional_filters").$type<Record<string, unknown>>(),

    // === DELIVERY ===
    bucketPath: varchar("bucket_path"),
    fileName: varchar("file_name"),
    fileSize: integer("file_size"),
    recordCount: integer("record_count"),

    // === PROCESSING STATUS ===
    status: varchar().notNull().default("ordered"),
    orderedAt: timestamp("ordered_at"),
    deliveredAt: timestamp("delivered_at"),
    ingestStartedAt: timestamp("ingest_started_at"),
    ingestCompletedAt: timestamp("ingest_completed_at"),

    // === INGESTION RESULTS ===
    businessesCreated: integer("businesses_created").default(0),
    personasCreated: integer("personas_created").default(0),
    leadsCreated: integer("leads_created").default(0),
    duplicatesSkipped: integer("duplicates_skipped").default(0),
    skipTraceQueued: integer("skiptrace_queued").default(0),
    enrichmentQueued: integer("enrichment_queued").default(0),

    // === COST TRACKING ===
    orderCost: real("order_cost"),
    costPerRecord: real("cost_per_record"),
    skipTraceCost: real("skiptrace_cost"),

    // === METADATA ===
    metadata: jsonb().$type<Record<string, unknown>>(),
    errorLog: text("error_log").array(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("data_sources_team_idx").on(t.teamId),
    index("data_sources_provider_idx").on(t.provider),
    index("data_sources_status_idx").on(t.status),
  ],
);

// =============================================================================
// CONSENT LOG TABLE
// =============================================================================

/**
 * Consent Log
 *
 * TCPA/CTIA compliance tracking for SMS consent.
 * Immutable audit trail - never update, only append.
 */
export const consentLog = pgTable(
  "consent_log",
  {
    id: primaryUlid(CONSENT_LOG_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn("lead_id").notNull(),
    personaId: ulidColumn("persona_id"),
    phone: varchar(),

    // === CONSENT DETAILS ===
    consentType: varchar("consent_type").notNull(),   // 'sms' | 'email' | 'call' | 'marketing'
    consentStatus: varchar("consent_status").notNull(), // 'requested' | 'granted' | 'denied' | 'revoked'
    consentMethod: varchar("consent_method").notNull(), // 'sms_reply' | 'web_form' | 'verbal' | 'implied_b2b'

    // === AUDIT TRAIL (Immutable) ===
    requestedAt: timestamp("requested_at"),
    grantedAt: timestamp("granted_at"),
    revokedAt: timestamp("revoked_at"),
    expiresAt: timestamp("expires_at"),

    // === CONTEXT ===
    requestMessageId: varchar("request_message_id"),
    responseMessageId: varchar("response_message_id"),
    responseText: text("response_text"),
    campaign: varchar(),

    // === COMPLIANCE METADATA ===
    tcpaDisclosure: boolean("tcpa_disclosure").notNull().default(false),
    doubleOptIn: boolean("double_opt_in").notNull().default(false),
    ipAddress: varchar("ip_address"),
    userAgent: text("user_agent"),

    // Immutable - no updatedAt
    createdAt,
  },
  (t) => [
    index("consent_log_team_idx").on(t.teamId),
    index("consent_log_lead_idx").on(t.leadId),
    index("consent_log_phone_idx").on(t.phone),
    index("consent_log_status_idx").on(t.consentStatus),
  ],
);

// =============================================================================
// PRIORITY QUEUE TABLE
// =============================================================================

/**
 * Priority Queue
 *
 * Real-time prioritization of leads for processing.
 * Inbound responses → High intent → Warm → Cold
 */
export const priorityQueue = pgTable(
  "priority_queue",
  {
    id: primaryUlid(PRIORITY_QUEUE_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn("lead_id").notNull(),

    // === PRIORITY ===
    tier: varchar().$type<PriorityTier>().notNull().default("cold"),
    score: real().notNull().default(0),               // Composite priority score
    dollarPerMinute: real("dollar_per_minute"),       // Estimated $/min value

    // === TIMING ===
    queuedAt: timestamp("queued_at").notNull(),
    processBy: timestamp("process_by"),               // SLA deadline
    processedAt: timestamp("processed_at"),

    // === CONTEXT ===
    triggerEvent: varchar("trigger_event"),           // What caused this queue entry
    triggerSource: varchar("trigger_source"),         // 'inbound' | 'timer' | 'campaign' | 'manual'
    categoryId: ulidColumn("category_id"),

    // === STATUS ===
    status: varchar().notNull().default("pending"),   // 'pending' | 'processing' | 'completed' | 'expired'
    assignedTo: varchar("assigned_to"),               // User or AI agent

    // === OUTCOME ===
    outcomeAction: varchar("outcome_action"),
    outcomeNotes: text("outcome_notes"),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("priority_queue_team_tier_idx").on(t.teamId, t.tier),
    index("priority_queue_score_idx").on(t.score),
    index("priority_queue_process_by_idx").on(t.processBy),
    index("priority_queue_status_idx").on(t.status),
  ],
);

// =============================================================================
// RELATIONS
// =============================================================================

export const targetingCategoriesRelations = relations(targetingCategories, ({ one, many }) => ({
  team: one(teams, {
    fields: [targetingCategories.teamId],
    references: [teams.id],
  }),
  parent: one(targetingCategories, {
    fields: [targetingCategories.parentCategoryId],
    references: [targetingCategories.id],
  }),
  industryCodes: many(industryCodes),
}));

export const industryCodesRelations = relations(industryCodes, ({ one }) => ({
  category: one(targetingCategories, {
    fields: [industryCodes.categoryId],
    references: [targetingCategories.id],
  }),
}));

export const dataSourcesRelations = relations(dataSources, ({ one }) => ({
  team: one(teams, {
    fields: [dataSources.teamId],
    references: [teams.id],
  }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type TargetingCategory = typeof targetingCategories.$inferSelect;
export type NewTargetingCategory = typeof targetingCategories.$inferInsert;
export type IndustryCode = typeof industryCodes.$inferSelect;
export type NewIndustryCode = typeof industryCodes.$inferInsert;
export type DataSource = typeof dataSources.$inferSelect;
export type NewDataSource = typeof dataSources.$inferInsert;
export type ConsentLogEntry = typeof consentLog.$inferSelect;
export type NewConsentLogEntry = typeof consentLog.$inferInsert;
export type PriorityQueueEntry = typeof priorityQueue.$inferSelect;
export type NewPriorityQueueEntry = typeof priorityQueue.$inferInsert;

// =============================================================================
// PRIORITIZATION ENGINE FUNCTIONS
// =============================================================================

/**
 * Calculate composite priority score
 * Higher score = process first
 */
export function calculatePriorityScore(params: {
  tier: PriorityTier;
  valueTier: ValueTier;
  recencyMinutes: number;
  intentSignals: number;
  engagementScore: number;
}): number {
  const { tier, valueTier, recencyMinutes, intentSignals, engagementScore } = params;

  // Base scores by tier
  const tierScores: Record<PriorityTier, number> = {
    critical: 10000,      // Inbound - always first
    high_intent: 5000,    // Buying signals
    warm: 1000,           // Previous engagement
    scheduled: 500,       // Timed sequences
    cold: 100,            // New outreach
    suppressed: 0,        // Never process
  };

  // Value multipliers
  const valueMultipliers: Record<ValueTier, number> = {
    premium: 2.0,
    standard: 1.0,
    volume: 0.5,
    nurture: 0.3,
  };

  // Recency decay (halves every 60 minutes)
  const recencyDecay = Math.pow(0.5, recencyMinutes / 60);

  const baseScore = tierScores[tier];
  const valueMultiplier = valueMultipliers[valueTier];
  const intentBonus = intentSignals * 100;
  const engagementBonus = engagementScore * 50;

  return (baseScore + intentBonus + engagementBonus) * valueMultiplier * recencyDecay;
}

/**
 * Calculate dollar per minute value
 */
export function calculateDollarPerMinute(params: {
  avgDealValue: number;
  conversionRate: number;
  avgTimeToCloseMinutes: number;
}): number {
  const { avgDealValue, conversionRate, avgTimeToCloseMinutes } = params;

  if (avgTimeToCloseMinutes <= 0) return 0;

  return (avgDealValue * conversionRate) / avgTimeToCloseMinutes;
}

// =============================================================================
// SEED DATA: Business Broker Categories
// =============================================================================

export const SEED_TARGETING_CATEGORIES: Omit<NewTargetingCategory, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Professional Services",
    slug: "professional-services",
    description: "Accounting, legal, engineering, consulting with recurring revenue",
    classificationSystem: "sic",
    priorityTier: "warm",
    valueTier: "premium",
    avgDealValue: 2500000,
    avgConversionRate: 0.15,
    avgTimeToClose: 180,
    dollarPerMinute: 1.45,
    intentWeight: 1.2,
    engagementWeight: 1.5,
    recencyWeight: 1.8,
    fitWeight: 1.3,
    propertyOwnershipLikelihood: 0.65, // Often own their office
    businessPropertyCorrelation: true,
    minRevenue: 1000000,
    maxRevenue: 50000000,
    typicalMultiple: "1.5-3.0x",
    isActive: true,
    isGlobal: true,
    sortOrder: 1,
  },
  {
    name: "Healthcare & Medical",
    slug: "healthcare-medical",
    description: "Medical practices, dental, home health with steady demand",
    classificationSystem: "sic",
    priorityTier: "warm",
    valueTier: "premium",
    avgDealValue: 3000000,
    avgConversionRate: 0.12,
    avgTimeToClose: 240,
    dollarPerMinute: 1.04,
    intentWeight: 1.3,
    engagementWeight: 1.4,
    recencyWeight: 1.5,
    fitWeight: 1.4,
    propertyOwnershipLikelihood: 0.55, // Mixed - some own, some lease
    businessPropertyCorrelation: true,
    minRevenue: 1000000,
    maxRevenue: 50000000,
    typicalMultiple: "2.0-4.0x",
    isActive: true,
    isGlobal: true,
    sortOrder: 2,
  },
  {
    name: "Technology & Software",
    slug: "technology-software",
    description: "SaaS, IT services, software with high growth potential",
    classificationSystem: "sic",
    priorityTier: "high_intent",
    valueTier: "premium",
    avgDealValue: 5000000,
    avgConversionRate: 0.08,
    avgTimeToClose: 120,
    dollarPerMinute: 2.78,
    intentWeight: 1.5,
    engagementWeight: 1.2,
    recencyWeight: 2.0,
    fitWeight: 1.5,
    propertyOwnershipLikelihood: 0.20, // Usually lease
    businessPropertyCorrelation: false,
    minRevenue: 500000,
    maxRevenue: 50000000,
    typicalMultiple: "3.0-8.0x",
    isActive: true,
    isGlobal: true,
    sortOrder: 3,
  },
  {
    name: "Manufacturing",
    slug: "manufacturing",
    description: "Industrial, specialty manufacturing with equipment and real estate",
    classificationSystem: "sic",
    priorityTier: "warm",
    valueTier: "premium",
    avgDealValue: 4000000,
    avgConversionRate: 0.10,
    avgTimeToClose: 200,
    dollarPerMinute: 1.39,
    intentWeight: 1.4,
    engagementWeight: 1.3,
    recencyWeight: 1.5,
    fitWeight: 1.6,
    propertyOwnershipLikelihood: 0.75, // High likelihood of owning facility
    businessPropertyCorrelation: true,
    minRevenue: 2000000,
    maxRevenue: 50000000,
    typicalMultiple: "3.0-6.0x",
    isActive: true,
    isGlobal: true,
    sortOrder: 4,
  },
  {
    name: "Building Trades",
    slug: "building-trades",
    description: "Plumbing, electrical, HVAC, roofing contractors with crews",
    classificationSystem: "sic",
    priorityTier: "scheduled",
    valueTier: "standard",
    avgDealValue: 1500000,
    avgConversionRate: 0.18,
    avgTimeToClose: 120,
    dollarPerMinute: 1.56,
    intentWeight: 1.0,
    engagementWeight: 1.2,
    recencyWeight: 1.3,
    fitWeight: 1.1,
    propertyOwnershipLikelihood: 0.40, // Often own yard/warehouse
    businessPropertyCorrelation: true,
    minRevenue: 1000000,
    maxRevenue: 25000000,
    typicalMultiple: "0.8-2.0x",
    isActive: true,
    isGlobal: true,
    sortOrder: 5,
  },
  {
    name: "Distribution & Wholesale",
    slug: "distribution-wholesale",
    description: "Industrial, medical, specialty distributors with inventory",
    classificationSystem: "sic",
    priorityTier: "scheduled",
    valueTier: "standard",
    avgDealValue: 2000000,
    avgConversionRate: 0.12,
    avgTimeToClose: 150,
    dollarPerMinute: 1.11,
    intentWeight: 1.1,
    engagementWeight: 1.2,
    recencyWeight: 1.4,
    fitWeight: 1.3,
    propertyOwnershipLikelihood: 0.50, // Often own warehouse
    businessPropertyCorrelation: true,
    minRevenue: 2000000,
    maxRevenue: 30000000,
    typicalMultiple: "1.5-3.0x",
    isActive: true,
    isGlobal: true,
    sortOrder: 6,
  },
  {
    name: "Hospitality & Food",
    slug: "hospitality-food",
    description: "Restaurants, hotels, event venues with location assets",
    classificationSystem: "sic",
    priorityTier: "cold",
    valueTier: "volume",
    avgDealValue: 800000,
    avgConversionRate: 0.08,
    avgTimeToClose: 90,
    dollarPerMinute: 0.49,
    intentWeight: 0.8,
    engagementWeight: 1.0,
    recencyWeight: 1.2,
    fitWeight: 0.9,
    propertyOwnershipLikelihood: 0.30, // Usually lease
    businessPropertyCorrelation: false,
    minRevenue: 500000,
    maxRevenue: 10000000,
    typicalMultiple: "0.3-1.5x",
    isActive: true,
    isGlobal: true,
    sortOrder: 7,
  },
];

export const SEED_INDUSTRY_CODES: Omit<NewIndustryCode, "id" | "createdAt" | "updatedAt">[] = [
  // Professional Services
  { system: "sic", code: "8721", description: "Accounting, Auditing, and Bookkeeping Services", totalCount: 498775, avgMultiple: 2.0, priority: 100, isActive: true },
  { system: "sic", code: "8111", description: "Legal Services", totalCount: 1485798, avgMultiple: 1.6, priority: 90, isActive: true },
  { system: "sic", code: "8711", description: "Engineering Services", totalCount: 610317, avgMultiple: 2.4, priority: 95, isActive: true },
  { system: "sic", code: "8742", description: "Management Consulting Services", totalCount: 987465, avgMultiple: 3.0, priority: 98, isActive: true },
  // Healthcare
  { system: "sic", code: "8011", description: "Offices of Doctors of Medicine", totalCount: 1701012, avgMultiple: 2.5, priority: 95, isActive: true },
  { system: "sic", code: "8021", description: "Offices of Dentists", totalCount: 146432, avgMultiple: 2.0, priority: 90, isActive: true },
  { system: "sic", code: "8082", description: "Home Health Care Services", totalCount: 134887, avgMultiple: 3.0, priority: 92, isActive: true },
  // Technology
  { system: "sic", code: "7371", description: "Computer Programming Services", totalCount: 611879, avgMultiple: 4.0, priority: 99, isActive: true },
  { system: "sic", code: "7372", description: "Prepackaged Software", totalCount: 322320, avgMultiple: 5.5, priority: 100, isActive: true },
  { system: "sic", code: "7373", description: "Computer Integrated Systems Design", totalCount: 232883, avgMultiple: 3.5, priority: 95, isActive: true },
  // Insurance/Financial
  { system: "sic", code: "6411", description: "Insurance Agents, Brokers, and Service", totalCount: 1306302, avgMultiple: 2.0, priority: 85, isActive: true },
  { system: "sic", code: "6282", description: "Investment Advice", totalCount: 516863, avgMultiple: 3.0, priority: 88, isActive: true },
  // Building Trades
  { system: "sic", code: "1711", description: "Plumbing, Heating and Air Conditioning", totalCount: 271874, avgMultiple: 1.4, priority: 80, isActive: true },
  { system: "sic", code: "1731", description: "Electrical Work", totalCount: 246726, avgMultiple: 1.4, priority: 78, isActive: true },
  // Manufacturing
  { system: "sic", code: "3841", description: "Surgical and Medical Instruments", totalCount: 225260, avgMultiple: 5.0, priority: 92, isActive: true },
  // Distribution
  { system: "sic", code: "5084", description: "Industrial Machinery and Equipment", totalCount: 193838, avgMultiple: 2.0, priority: 82, isActive: true },
  { system: "sic", code: "5047", description: "Medical, Dental, Hospital Equipment", totalCount: 157294, avgMultiple: 3.0, priority: 85, isActive: true },
];
