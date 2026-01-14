/**
 * BUYER PERSONAS & ICP SCHEMA
 *
 * Growth OS Module: Persona Mapper & Target List + ICP
 *
 * Purpose:
 * - Define Ideal Customer Profiles (ICP) per team
 * - Map buyer personas with emotional drivers
 * - Store objection patterns and rebuttals
 * - Route messaging tone based on persona
 *
 * Flow:
 * Lead Import → ICP Match → Persona Assignment → Tone Routing → Template Selection
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
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

// =============================================================================
// IDEAL CUSTOMER PROFILE (ICP)
// =============================================================================

export const ICP_PK = "icp";

/**
 * Ideal Customer Profile - defines who the team wants to target
 */
export const idealCustomerProfiles = pgTable(
  "ideal_customer_profiles",
  {
    id: primaryUlid(ICP_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    name: varchar({ length: 255 }).notNull(),
    description: text(),
    isActive: boolean("is_active").default(true),
    isDefault: boolean("is_default").default(false),

    // === Company Criteria ===
    firmographics: jsonb("firmographics").$type<{
      industries?: string[];
      excludeIndustries?: string[];
      sicCodes?: string[];
      naicsCodes?: string[];
      minEmployees?: number;
      maxEmployees?: number;
      minRevenue?: number;
      maxRevenue?: number;
      companyTypes?: string[]; // 'private', 'public', 'non-profit', etc.
      yearFoundedMin?: number;
      yearFoundedMax?: number;
    }>(),

    // === Geographic Criteria ===
    geography: jsonb("geography").$type<{
      countries?: string[];
      states?: string[];
      excludeStates?: string[];
      cities?: string[];
      metros?: string[];
      radiusMiles?: number;
      radiusCenter?: { lat: number; lng: number };
    }>(),

    // === Contact Criteria ===
    demographics: jsonb("demographics").$type<{
      titles?: string[];
      titlePatterns?: string[]; // Regex patterns for title matching
      excludeTitles?: string[];
      departments?: string[];
      seniorityLevels?: string[]; // 'c-suite', 'vp', 'director', 'manager', 'individual'
      minYearsInRole?: number;
    }>(),

    // === Behavioral Criteria ===
    technographics: jsonb("technographics").$type<{
      technologies?: string[];
      excludeTechnologies?: string[];
      techCategories?: string[];
    }>(),

    // === Scoring Weights ===
    scoringWeights: jsonb("scoring_weights").$type<{
      firmographicsWeight: number;
      geographyWeight: number;
      demographicsWeight: number;
      technographicsWeight: number;
    }>(),

    // Score threshold to qualify
    qualificationThreshold: integer("qualification_threshold").default(70),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("icp_team_idx").on(t.teamId),
    index("icp_active_idx").on(t.teamId, t.isActive),
    index("icp_default_idx").on(t.teamId, t.isDefault),
  ],
);

// =============================================================================
// BUYER PERSONAS
// =============================================================================

export const BUYER_PERSONA_PK = "bpr";

export type PersonaTone = "professional" | "friendly" | "casual" | "urgent" | "consultative";
export type PersonaDecisionStyle = "analytical" | "driver" | "amiable" | "expressive";
export type PersonaBuyingStage = "problem_aware" | "solution_aware" | "product_aware" | "most_aware";

/**
 * Buyer Persona - psychological profile for targeting
 */
export const buyerPersonas = pgTable(
  "buyer_personas",
  {
    id: primaryUlid(BUYER_PERSONA_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    icpId: ulidColumn("icp_id"), // Optional link to ICP

    name: varchar({ length: 255 }).notNull(), // e.g., "Tech-Savvy CEO", "Budget-Conscious CFO"
    description: text(),
    isActive: boolean("is_active").default(true),

    // === Role Definition ===
    typicalTitles: jsonb("typical_titles").$type<string[]>(),
    typicalDepartments: jsonb("typical_departments").$type<string[]>(),
    seniorityLevel: varchar("seniority_level", { length: 50 }), // c-suite, vp, director, manager

    // === Decision-Making Profile ===
    decisionStyle: varchar("decision_style", { length: 50 }).$type<PersonaDecisionStyle>(),
    buyingStage: varchar("buying_stage", { length: 50 }).$type<PersonaBuyingStage>(),
    typicalBudgetAuthority: varchar("typical_budget_authority", { length: 50 }), // 'full', 'partial', 'recommend', 'none'

    // === Communication Preferences ===
    preferredTone: varchar("preferred_tone", { length: 50 })
      .default("professional")
      .$type<PersonaTone>(),
    preferredChannels: jsonb("preferred_channels").$type<string[]>(), // ['sms', 'email', 'call']
    bestContactTimes: jsonb("best_contact_times").$type<{
      timezone?: string;
      days?: string[];
      hours?: { start: number; end: number };
    }>(),

    // === Emotional Drivers ===
    emotionalDrivers: jsonb("emotional_drivers").$type<{
      primary: string[]; // e.g., ['efficiency', 'cost_savings', 'growth']
      secondary: string[];
      fears: string[]; // e.g., ['missing_opportunity', 'wasting_budget', 'job_security']
      aspirations: string[];
    }>(),

    // === Pain Points ===
    painPoints: jsonb("pain_points").$type<{
      primary: string[];
      secondary: string[];
      urgency: "high" | "medium" | "low";
    }>(),

    // === Messaging Guidance ===
    messagingGuidance: jsonb("messaging_guidance").$type<{
      leadWith: string[]; // What to emphasize first
      avoid: string[]; // What to avoid saying
      proofPoints: string[]; // What evidence resonates
      ctaStyle: string; // 'direct', 'soft', 'question'
    }>(),

    // === Template Routing ===
    // Maps to stage-cartridges.ts categories
    preferredCartridgeCategories: jsonb("preferred_cartridge_categories").$type<string[]>(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("bpr_team_idx").on(t.teamId),
    index("bpr_icp_idx").on(t.icpId),
    index("bpr_active_idx").on(t.teamId, t.isActive),
    index("bpr_tone_idx").on(t.preferredTone),
  ],
);

// =============================================================================
// OBJECTION PATTERNS
// =============================================================================

export const OBJECTION_PK = "obj";

export type ObjectionCategory =
  | "price" // Too expensive, no budget
  | "timing" // Not now, too busy
  | "authority" // Not my decision
  | "need" // Don't need it
  | "trust" // Don't know you
  | "competition" // Using someone else
  | "status_quo"; // Current solution works

/**
 * Objection Patterns - common objections and how to handle them
 */
export const objectionPatterns = pgTable(
  "objection_patterns",
  {
    id: primaryUlid(OBJECTION_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    personaId: ulidColumn("persona_id"), // Optional link to buyer persona

    // === Objection Definition ===
    category: varchar({ length: 50 }).notNull().$type<ObjectionCategory>(),
    pattern: varchar({ length: 500 }).notNull(), // The objection text pattern
    variations: jsonb("variations").$type<string[]>(), // Alternative phrasings

    // === Response Strategy ===
    rebuttalStrategy: varchar("rebuttal_strategy", { length: 50 }), // 'empathize', 'reframe', 'proof', 'question'
    rebuttals: jsonb("rebuttals").$type<{
      primary: string;
      alternatives: string[];
      followUp: string;
    }>(),

    // === Performance Tracking ===
    useCount: integer("use_count").default(0),
    successCount: integer("success_count").default(0), // Times objection was overcome
    successRate: real("success_rate").default(0),

    isActive: boolean("is_active").default(true),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("obj_team_idx").on(t.teamId),
    index("obj_persona_idx").on(t.personaId),
    index("obj_category_idx").on(t.category),
    index("obj_active_idx").on(t.teamId, t.isActive),
  ],
);

// =============================================================================
// PERSONA ASSIGNMENTS (Lead → Persona Mapping)
// =============================================================================

export const PERSONA_ASSIGNMENT_PK = "pas";

/**
 * Tracks which persona a lead has been assigned
 */
export const personaAssignments = pgTable(
  "persona_assignments",
  {
    id: primaryUlid(PERSONA_ASSIGNMENT_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn("lead_id").notNull(),
    personaId: ulidColumn("persona_id").notNull(),
    icpId: ulidColumn("icp_id"),

    // === Assignment Details ===
    assignedBy: varchar("assigned_by", { length: 50 }), // 'auto', 'manual', user ID
    confidence: real().default(1.0), // 0-1 confidence in assignment
    matchReasons: jsonb("match_reasons").$type<string[]>(), // Why this persona was assigned

    // === ICP Score ===
    icpScore: integer("icp_score"), // 0-100 score against ICP
    icpScoreBreakdown: jsonb("icp_score_breakdown").$type<{
      firmographics?: number;
      geography?: number;
      demographics?: number;
      technographics?: number;
    }>(),

    isActive: boolean("is_active").default(true),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("pas_team_idx").on(t.teamId),
    index("pas_lead_idx").on(t.leadId),
    index("pas_persona_idx").on(t.personaId),
    index("pas_icp_idx").on(t.icpId),
  ],
);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type IdealCustomerProfile = typeof idealCustomerProfiles.$inferSelect;
export type NewIdealCustomerProfile = typeof idealCustomerProfiles.$inferInsert;

export type BuyerPersona = typeof buyerPersonas.$inferSelect;
export type NewBuyerPersona = typeof buyerPersonas.$inferInsert;

export type ObjectionPattern = typeof objectionPatterns.$inferSelect;
export type NewObjectionPattern = typeof objectionPatterns.$inferInsert;

export type PersonaAssignment = typeof personaAssignments.$inferSelect;
export type NewPersonaAssignment = typeof personaAssignments.$inferInsert;

// =============================================================================
// REFERENCE HELPERS
// =============================================================================

export const icpRef = (config?: { onDelete?: "cascade" | "set null" }) =>
  ulidColumn("icp_id").references(() => idealCustomerProfiles.id, config);

export const buyerPersonaRef = (config?: { onDelete?: "cascade" | "set null" }) =>
  ulidColumn("persona_id").references(() => buyerPersonas.id, config);

// =============================================================================
// PERSONA TONE ROUTING
// =============================================================================

/**
 * Maps persona decision styles to preferred message tones
 */
export const DECISION_STYLE_TONE_MAP: Record<PersonaDecisionStyle, PersonaTone> = {
  analytical: "professional",
  driver: "urgent",
  amiable: "friendly",
  expressive: "casual",
};

/**
 * Get recommended tone for a persona
 */
export function getRecommendedTone(persona: BuyerPersona): PersonaTone {
  if (persona.preferredTone) {
    return persona.preferredTone;
  }
  if (persona.decisionStyle) {
    return DECISION_STYLE_TONE_MAP[persona.decisionStyle];
  }
  return "professional";
}

// =============================================================================
// ICP SCORING HELPERS
// =============================================================================

/**
 * Default scoring weights if not specified in ICP
 */
export const DEFAULT_ICP_WEIGHTS = {
  firmographicsWeight: 0.35,
  geographyWeight: 0.15,
  demographicsWeight: 0.35,
  technographicsWeight: 0.15,
};

/**
 * Calculate overall ICP score from component scores
 */
export function calculateIcpScore(
  scores: {
    firmographics?: number;
    geography?: number;
    demographics?: number;
    technographics?: number;
  },
  weights = DEFAULT_ICP_WEIGHTS,
): number {
  let total = 0;
  let weightSum = 0;

  if (scores.firmographics !== undefined) {
    total += scores.firmographics * weights.firmographicsWeight;
    weightSum += weights.firmographicsWeight;
  }
  if (scores.geography !== undefined) {
    total += scores.geography * weights.geographyWeight;
    weightSum += weights.geographyWeight;
  }
  if (scores.demographics !== undefined) {
    total += scores.demographics * weights.demographicsWeight;
    weightSum += weights.demographicsWeight;
  }
  if (scores.technographics !== undefined) {
    total += scores.technographics * weights.technographicsWeight;
    weightSum += weights.technographicsWeight;
  }

  return weightSum > 0 ? Math.round(total / weightSum) : 0;
}
