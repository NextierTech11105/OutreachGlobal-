// GIANNA MESSAGE LIBRARY - 160 CHAR MASTERPIECES
// Blunt NY Direct | Numbers Game | Two Captures: Valuation Report OR 15-Min Strategy
// Human-in-loop for first 3 rebuttals | Agent learns from feedback

// ============================================================================
// CAMPAIGN TYPE CLASSIFICATION
// ============================================================================
// IMPORTANT: These templates must be classified correctly for 10DLC compliance
//
// CONVERSATIONAL templates (use for Low Volume Mixed / Conversational campaigns):
// - Ask questions or seek permission
// - No promotional language (FREE!, ACT NOW!, LIMITED TIME)
// - Identify sender clearly
// - Single question per message
//
// MARKETING templates (DO NOT USE - campaign was rejected):
// - Promotional offers
// - Value propositions
// - Call-to-action heavy
//
// All OPENER_LIBRARY templates below are CONVERSATIONAL (permission-seeking)
// ============================================================================

export type CampaignType = "conversational" | "marketing";

// Template with campaign type classification
export interface ClassifiedTemplate {
  template: string;
  campaignType: CampaignType;
  compliant: boolean; // true if 10DLC compliant for its type
}

// CAPTURE GOALS - Configure per campaign
export const CAPTURE_GOALS = {
  valuation_report: {
    name: "",
    cta: "",
    value_prop: "",
  },
  strategy_session: {
    name: "",
    cta: "",
    value_prop: "",
  },
};

// ============ INITIAL OPENER LIBRARY - 160 CHAR MAX ============
// CLEARED FOR PRODUCTION DATA - Add templates via admin panel
// Categories: Property/Real Estate, Business/Blue Collar, AI/Tech, General
//
// AVAILABLE VARIABLES:
// - {firstName} - Lead's first name
// - {lastName} - Lead's last name
// - {companyName} - Company name
// - {industry} - Industry/vertical
// - {address} - Property address
// - {street} - Street name
// - {city} - City
// - {state} - State
//
export const OPENER_LIBRARY = {
  // === PROPERTY/REAL ESTATE OPENERS ===
  property: [], // Add via admin panel

  // === BUSINESS/BLUE COLLAR OPENERS ===
  business: [], // Add via admin panel

  // === GENERAL/UNIVERSAL OPENERS ===
  general: [], // Add via admin panel

  // === NY DIRECT/AGGRESSIVE OPENERS ===
  ny_direct: [], // Add via admin panel
};

// ============ REBUTTAL LIBRARY - HUMAN-IN-LOOP FOR FIRST 3 ============
// CLEARED FOR PRODUCTION DATA - Add rebuttals via admin panel
//
// AVAILABLE VARIABLES:
// - {firstName} - Lead's first name
// - {companyName} - Company name
//
// STRUCTURE:
// - trigger: array of keywords that activate this rebuttal
// - responses: array of response options (AI learns best performer)
// - learned_best: index of best performing response (AI learns)
// - action: optional action like "add_to_dnc"
//
export const REBUTTAL_LIBRARY = {
  // Category: "Not Interested"
  not_interested: {
    human_in_loop: true,
    rebuttals: [], // Add via admin panel
  },

  // Category: "Too Busy"
  too_busy: {
    human_in_loop: true,
    rebuttals: [], // Add via admin panel
  },

  // Category: "Already Have Solution"
  already_have: {
    human_in_loop: true,
    rebuttals: [], // Add via admin panel
  },

  // Category: "Cost/Money"
  cost_concerns: {
    human_in_loop: true,
    rebuttals: [], // Add via admin panel
  },

  // Category: "Skeptical"
  skeptical: {
    human_in_loop: true,
    rebuttals: [], // Add via admin panel
  },
};

// ============ LEARNING SYSTEM - AGENT IMPROVES FROM FEEDBACK ============
export interface MessagePerformance {
  messageId: string;
  template: string;
  category: string;
  sent: number;
  responses: number;
  positive_responses: number;
  conversions: number; // Led to call booking
  response_rate: number;
  conversion_rate: number;
  last_used: string;
  user_feedback: "good" | "bad" | "neutral" | null;
  user_modified?: string; // User's improved version
}

export interface RebuttalPerformance {
  rebuttalId: string;
  responses_used: number;
  successful_continues: number; // Kept conversation going
  conversions: number;
  success_rate: number;
  best_response_index: number | null; // Which response works best
}

// Learning configuration
export const LEARNING_CONFIG = {
  // After X uses, start preferring high performers
  min_samples_for_learning: 10,

  // Weight for response rate vs conversion rate
  weights: {
    response_rate: 0.3,
    conversion_rate: 0.7,
  },

  // Promote message to "proven" after hitting these thresholds
  promotion_thresholds: {
    min_sends: 20,
    min_response_rate: 0.15, // 15%
    min_conversion_rate: 0.05, // 5%
  },

  // Demote message after poor performance
  demotion_thresholds: {
    min_sends: 20,
    max_response_rate: 0.05, // Below 5%
  },

  // Human-in-loop settings
  human_in_loop: {
    required_for_new_rebuttals: true,
    max_rebuttals_before_auto: 3, // After 3, AI can handle
    approval_timeout_hours: 24, // Auto-proceed after 24h
  },
};

// Function to get best performing openers
export function getBestOpeners(
  category: keyof typeof OPENER_LIBRARY,
  performance: MessagePerformance[],
  count: number = 5,
): string[] {
  const categoryMessages = OPENER_LIBRARY[category];

  // If no performance data, return random selection
  if (!performance.length) {
    return categoryMessages.sort(() => Math.random() - 0.5).slice(0, count);
  }

  // Sort by weighted score
  const scored = categoryMessages.map((msg) => {
    const perf = performance.find((p) => p.template === msg);
    if (!perf || perf.sent < LEARNING_CONFIG.min_samples_for_learning) {
      return { msg, score: 0.5 }; // Default score for unproven messages
    }
    const score =
      perf.response_rate * LEARNING_CONFIG.weights.response_rate +
      perf.conversion_rate * LEARNING_CONFIG.weights.conversion_rate;
    return { msg, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s) => s.msg);
}

// Function to record user feedback
export function recordFeedback(data: {
  messageId: string;
  feedback: "good" | "bad" | "neutral";
  userModification?: string;
  resulted_in_response?: boolean;
  resulted_in_booking?: boolean;
}): void {
  // In production: save to database
  console.log("[Learning] Feedback recorded:", data);

  // If user modified the message and it worked, add to library
  if (data.userModification && data.feedback === "good") {
    console.log(
      "[Learning] User improvement added to library:",
      data.userModification,
    );
  }
}

export default OPENER_LIBRARY;
