/**
 * NEVA Types - Research Copilot
 *
 * NEVA provides:
 * - Business context & intelligence
 * - Timing signals
 * - Personalization recommendations
 *
 * NEVA is ADVISORY ONLY.
 * NEVA may NEVER override LUCI compliance decisions.
 */

// =============================================================================
// CORE INTERFACES
// =============================================================================

export interface NevaContextPacket {
  lead_id: string;
  team_id: string;
  confidence: number; // 0-1, how confident NEVA is in this research

  // Business summary
  summary: {
    company: string;
    size_signal: "small" | "medium" | "large" | "unknown";
    years_in_business: number | null;
    employee_estimate: string | null;
  };

  // Intelligence signals
  signals: {
    recent_activity: string[];     // "New location opened", "Hired 5 people"
    negative_signals: string[];    // "BBB complaints", "Lawsuit"
    timing_signals: string[];      // "Just raised funding", "Seasonal peak"
  };

  // Personalization for outreach
  personalization: {
    opening_hook: string;          // "I saw you just opened a second location..."
    industry_language: string[];   // Industry-specific terms to use
    location_reference: string;    // "in Nassau County"
    avoid_topics: string[];        // Topics to avoid based on research
  };

  // Worker routing recommendations
  recommendations: {
    best_worker: "GIANNA" | "CATHY" | "SABRINA";
    tone: "professional" | "casual" | "urgent" | "friendly";
    cta: string;                   // Suggested call-to-action
    discovery_questions: string[]; // Questions for 15-min call
  };

  // Risk flags (triggers LUCI recheck if true)
  risk_flags: {
    reputation: boolean;           // Bad reviews, complaints
    legal: boolean;                // Lawsuits, regulatory issues
    financial_distress: boolean;   // Bankruptcy, liens
  };

  // Metadata
  researched_at: Date;
  sources: string[];               // Where NEVA got the info
  cache_key: string | null;        // For caching research
}

// =============================================================================
// ENRICH REQUEST
// =============================================================================

export interface NevaEnrichRequest {
  lead_id: string;
  team_id: string;

  // Business info to research
  business: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    industry?: string;
  };

  // Owner info (optional, for deeper research)
  owner?: {
    name?: string;
    email?: string;
  };

  // Context for research focus
  context: {
    campaign_type: "cold_outreach" | "nurture" | "reactivation";
    intent: string;                // What we're trying to achieve
    prior_interactions?: number;   // How many times we've contacted
  };

  // Options
  options?: {
    skip_cache?: boolean;          // Force fresh research
    max_depth?: "shallow" | "normal" | "deep";
    timeout_ms?: number;
  };
}

// =============================================================================
// DISCOVERY PREP (15-min call questions)
// =============================================================================

export interface NevaDiscoveryPrep {
  lead_id: string;
  prepared_at: Date;

  // Pre-call context
  context_summary: string;         // 2-3 sentences about the business

  // Opening questions based on signals
  opening_questions: {
    question: string;
    signal_source: string;         // Why we're asking this
    priority: 1 | 2 | 3;
  }[];

  // Pain points to probe
  pain_points: string[];

  // Objection handlers
  likely_objections: {
    objection: string;
    response: string;
  }[];

  // Talking points
  value_props: string[];           // Key value propositions to mention
}

// =============================================================================
// CONFIDENCE THRESHOLDS
// =============================================================================

export type NevaConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface NevaConfidenceResult {
  level: NevaConfidenceLevel;
  score: number;                   // 0-1
  use_personalization: boolean;    // Should we use NEVA's personalization?
  requires_review: boolean;        // Should a human review this?
}
