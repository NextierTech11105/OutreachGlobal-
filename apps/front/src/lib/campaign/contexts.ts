/**
 * CAMPAIGN CONTEXTS - SINGLE SOURCE OF TRUTH
 *
 * THE 7 STAGES:
 * initial → retarget → nudge → nurture → book → reminder → deal
 *
 * ALL OTHER FILES IMPORT FROM HERE.
 * Do NOT define campaign contexts elsewhere.
 */

// =============================================================================
// CAMPAIGN CONTEXT TYPE
// =============================================================================

export type CampaignContext =
  | "initial" // GIANNA - First touch, get attention
  | "retarget" // GIANNA - No response follow-up (Day 3-5)
  | "nudge" // CATHY - Pattern break, different number (Day 14+)
  | "nurture" // GIANNA - Content drip, "Did You Know" intel
  | "book" // SABRINA - 15 min with Tommy
  | "reminder" // APPOINTMENT_BOT - Appt reminder
  | "deal"; // DEAL_MODULE - Post-appointment deal tracking

// =============================================================================
// RESPONSE OUTCOMES
// =============================================================================

export type ResponseOutcome =
  | "captured" // Mobile/email obtained → CALL QUEUE (+100% score)
  | "interested" // Positive signal → BOOK stage
  | "question" // Needs follow-up → GIANNA responds
  | "no_response" // Advance to next stage
  | "negative" // Move to nurture or exit
  | "opt_out"; // DNC immediately

// =============================================================================
// AI AGENT TYPES
// =============================================================================

export type AIAgent =
  | "GIANNA"
  | "CATHY"
  | "SABRINA"
  | "NEVA"
  | "APPOINTMENT_BOT";

// =============================================================================
// STAGE CONFIGURATION
// =============================================================================

export interface StageConfig {
  id: CampaignContext;
  name: string;
  agent: AIAgent;
  order: number;
  delayDays?: number;
  differentNumber?: boolean;
  goal: string;
  campaignType: string; // Maps to LUCI campaign types
}

export const STAGE_CONFIG: Record<CampaignContext, StageConfig> = {
  initial: {
    id: "initial",
    name: "Initial Message",
    agent: "GIANNA",
    order: 1,
    goal: "Get attention, capture mobile/email",
    campaignType: "SMS_INITIAL",
  },
  retarget: {
    id: "retarget",
    name: "Retarget",
    agent: "GIANNA",
    order: 2,
    delayDays: 3,
    goal: "Re-engage non-responders",
    campaignType: "SMS_RETARGET_NC",
  },
  nudge: {
    id: "nudge",
    name: "Nudger",
    agent: "CATHY",
    order: 3,
    delayDays: 14,
    differentNumber: true,
    goal: "Pattern break with humor",
    campaignType: "SMS_NUDGE",
  },
  nurture: {
    id: "nurture",
    name: "Content Nurture",
    agent: "GIANNA",
    order: 4,
    goal: "Deliver value: Did You Know facts, industry news, articles, insights",
    campaignType: "SMS_NURTURE",
  },
  book: {
    id: "book",
    name: "Book Appt",
    agent: "SABRINA",
    order: 5,
    goal: "15 min discovery with Tommy",
    campaignType: "BOOK_APPOINTMENT",
  },
  reminder: {
    id: "reminder",
    name: "Appt Reminder",
    agent: "APPOINTMENT_BOT",
    order: 6,
    goal: "Confirm upcoming appointment, reduce no-shows",
    campaignType: "APPT_REMINDER",
  },
  deal: {
    id: "deal",
    name: "Deal Module",
    agent: "SABRINA",
    order: 7,
    goal: "Track deal progress post-appointment",
    campaignType: "DEAL_TRACKING",
  },
};

// =============================================================================
// CONTEXT FLOW MAP - What comes next based on response
// =============================================================================

export const CONTEXT_FLOW: CampaignContext[] = [
  "initial",
  "retarget",
  "nudge",
  "nurture",
  "book",
  "reminder",
  "deal",
];

export const CONTEXT_NEXT: Record<CampaignContext, CampaignContext[]> = {
  initial: ["retarget", "book"], // No response → retarget, captured → book
  retarget: ["nudge", "book"], // No response → nudge, captured → book
  nudge: ["nurture", "book"], // No response → nurture, captured → book
  nurture: ["retarget", "book"], // Loop back or book
  book: ["reminder"], // After booking → reminder
  reminder: ["deal"], // After reminder → deal
  deal: [], // Terminal stage
};

// =============================================================================
// SCORE BOOST ON CAPTURE
// =============================================================================

export const CAPTURE_SCORE_BOOST = {
  mobile: 100, // +100% for mobile capture
  email: 100, // +100% for email capture
  both: 200, // +200% for both
  calledBack: 75, // +75% if they called back
  question: 50, // +50% if they asked a question
  interest: 50, // +50% if they showed interest
};

// =============================================================================
// MOBILE-ONLY VALIDATION
// =============================================================================

export interface PhoneWithType {
  number: string;
  type?: "mobile" | "landline" | "unknown";
}

/**
 * Validate lead can receive SMS (must have mobile phone)
 */
export function canSendSMS(lead: {
  mobilePhone?: string;
  enrichedPhones?: PhoneWithType[];
}): boolean {
  // Has explicit mobile phone
  if (lead.mobilePhone) return true;

  // Has enriched phone marked as mobile
  if (lead.enrichedPhones?.some((p) => p.type === "mobile")) return true;

  // No mobile = no SMS
  return false;
}

/**
 * Get mobile phone from lead
 */
export function getMobilePhone(lead: {
  mobilePhone?: string;
  enrichedPhones?: PhoneWithType[];
}): string | null {
  if (lead.mobilePhone) return lead.mobilePhone;

  const mobile = lead.enrichedPhones?.find((p) => p.type === "mobile");
  return mobile?.number || null;
}

// =============================================================================
// RESPONSE ROUTING
// =============================================================================

/**
 * Determine next action based on response outcome
 */
export function getNextAction(
  currentContext: CampaignContext,
  outcome: ResponseOutcome,
): { nextContext: CampaignContext | null; action: string } {
  switch (outcome) {
    case "captured":
      return { nextContext: "book", action: "PUSH_TO_CALL_QUEUE" };

    case "interested":
      return { nextContext: "book", action: "SABRINA_FOLLOW_UP" };

    case "question":
      return { nextContext: currentContext, action: "GIANNA_RESPOND" };

    case "no_response": {
      const nextStages = CONTEXT_NEXT[currentContext];
      const nextContext = nextStages[0] || null; // First option is no-response path
      return { nextContext, action: nextContext ? "ADVANCE_STAGE" : "EXIT" };
    }

    case "negative":
      return { nextContext: "nurture", action: "MOVE_TO_NURTURE" };

    case "opt_out":
      return { nextContext: null, action: "DNC_IMMEDIATELY" };

    default:
      return { nextContext: null, action: "MANUAL_REVIEW" };
  }
}

// =============================================================================
// CALCULATE LEAD PRIORITY
// =============================================================================

export function calculateLeadPriority(signals: {
  mobileCapture?: boolean;
  emailCapture?: boolean;
  calledBack?: boolean;
  askedQuestion?: boolean;
  expressedInterest?: boolean;
  baseScore?: number;
}): number {
  let score = signals.baseScore || 50;

  if (signals.mobileCapture) score += CAPTURE_SCORE_BOOST.mobile;
  if (signals.emailCapture) score += CAPTURE_SCORE_BOOST.email;
  if (signals.calledBack) score += CAPTURE_SCORE_BOOST.calledBack;
  if (signals.askedQuestion) score += CAPTURE_SCORE_BOOST.question;
  if (signals.expressedInterest) score += CAPTURE_SCORE_BOOST.interest;

  return Math.min(score, 500); // Cap at 500
}

// =============================================================================
// LEGACY COMPATIBILITY MAPPING
// =============================================================================

// Map old context names to new simplified ones
export const LEGACY_CONTEXT_MAP: Record<string, CampaignContext> = {
  // Old names → New names
  initial_message: "initial",
  initial: "initial",
  instant: "initial",
  scheduled: "initial",
  retarget: "retarget",
  ghost: "retarget",
  ghost_day_3: "retarget",
  ghost_day_7: "retarget",
  ghost_final: "retarget",
  nudger: "nudge",
  nudge: "nudge",
  follow_up: "nurture",
  nurture: "nurture",
  content_nurture: "nurture",
  nurture_soft_no: "nurture",
  book: "book",
  book_appt: "book",
  book_appointment: "book",
  confirm_appointment: "reminder",
  appt_reminder: "reminder",
  reminder: "reminder",
  deal: "deal",
  deal_module: "deal",
};

/**
 * Normalize legacy context to new simplified context
 */
export function normalizeContext(legacyContext: string): CampaignContext {
  return LEGACY_CONTEXT_MAP[legacyContext.toLowerCase()] || "initial";
}

// =============================================================================
// EXPORTS FOR BACKWARD COMPATIBILITY
// =============================================================================

// These match the old API for minimal breaking changes
export const ALL_CONTEXTS: CampaignContext[] = [
  "initial",
  "retarget",
  "nudge",
  "nurture",
  "book",
  "reminder",
  "deal",
];

export const CONTEXT_LABELS: Record<CampaignContext, string> = {
  initial: "Initial Message",
  retarget: "Retarget",
  nudge: "Nudger",
  nurture: "Content Nurture",
  book: "Book Appt",
  reminder: "Appt Reminder",
  deal: "Deal Module",
};

export const CONTEXT_AGENTS: Record<CampaignContext, AIAgent> = {
  initial: "GIANNA",
  retarget: "GIANNA",
  nudge: "CATHY",
  nurture: "GIANNA",
  book: "SABRINA",
  reminder: "APPOINTMENT_BOT",
  deal: "SABRINA",
};
