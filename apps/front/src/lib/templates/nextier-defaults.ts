/**
 * NEXTIER SMS TEMPLATE REFERENCE LIBRARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️  IMPORTANT: These are EXAMPLES for reference only, NOT auto-loaded defaults.
 *
 * Each client starts with NOTHING and builds proprietary cartridges:
 * - Templates are custom-built per client based on their business model
 * - Cartridges are assembled with client-approved messaging
 * - All templates must be under 160 characters (single SMS segment)
 * - Tone escalation: Authority → Curiosity → Direct → Humor → Final
 *
 * This file serves as:
 * - Reference patterns for template structure
 * - Variable token documentation
 * - Compliance rule definitions
 * - Worker role specifications
 *
 * VERTICALS (client types we support):
 * - CRM Consultant Partnerships
 * - Business Brokering (Trades M&A)
 * - Real Estate Agents
 * - Alternative Lending
 * - White Label Solutions
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type TemplateCategory =
  | "initial" // First contact - GIANNA
  | "retarget" // Re-engagement - CATHY
  | "nudge" // Friendly follow-up - CATHY
  | "closer" // Booking push - SABRINA
  | "breakup" // Final attempt before archive
  | "value-drop" // Content/case study share
  | "callback" // Response to inbound
  | "exit-expansion"; // Exit strategy & expansion prep

export type WorkerType = "gianna" | "cathy" | "sabrina";

export type VerticalType =
  | "crm-consultant"
  | "business-broker"
  | "real-estate"
  | "alternative-lending"
  | "white-label";

export interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  category: TemplateCategory;
  worker: WorkerType;
  vertical: VerticalType | "universal";
  variables: string[];
  complianceApproved: boolean;
  characterCount: number;
}

// Variable tokens available in templates
export const TEMPLATE_VARIABLES = {
  "{firstName}": "Lead's first name",
  "{lastName}": "Lead's last name",
  "{companyName}": "Lead's company name",
  "{industry}": "Lead's industry",
  "{city}": "Lead's city",
  "{state}": "Lead's state",
  "{title}": "Lead's job title",
  "{revenueRange}": "Company revenue range",
  "{employeeCount}": "Employee count",
  "{calendarLink}": "Booking calendar URL",
} as const;

// ============================================
// GIANNA TEMPLATES (Opener) - EXAMPLES ONLY
// ============================================
// These demonstrate proper template structure.
// Clients build their own templates based on their business.

// Templates cleared - build fresh per client
const GIANNA_EXAMPLE_TEMPLATES: SmsTemplate[] = [];

// ============================================
// CATHY TEMPLATES (Nudger) - EXAMPLES ONLY
// ============================================
// Demonstrates tone escalation: Authority → Curiosity → Direct → Humor → Final

// Templates cleared - build fresh per client
const CATHY_EXAMPLE_TEMPLATES: SmsTemplate[] = [];

// ============================================
// SABRINA TEMPLATES (Closer/Booker) - EXAMPLES ONLY
// ============================================
// Demonstrates booking and objection handling patterns

// Templates cleared - build fresh per client
const SABRINA_EXAMPLE_TEMPLATES: SmsTemplate[] = [];

// ============================================
// BREAKUP TEMPLATES - EXAMPLES ONLY
// ============================================
// Final messages before holstering - "Stopping is a feature, not a failure"

// Templates cleared - build fresh per client
const BREAKUP_EXAMPLE_TEMPLATES: SmsTemplate[] = [];

// ============================================
// SEQUENCE PRESETS - EXAMPLES ONLY
// ============================================
// These show how cartridge sequences can be structured.
// Each client builds their own sequences based on their messaging.

export interface SequenceStep {
  id: string;
  type: "sms" | "email" | "call" | "wait" | "condition";
  templateId?: string;
  waitDays?: number;
  waitHours?: number;
  condition?: {
    type: "no-response" | "replied" | "email-opened" | "link-clicked";
    threshold?: number; // hours
    thenAction: "continue" | "escalate" | "archive";
    escalateTo?: WorkerType;
  };
}

export interface SequencePreset {
  id: string;
  name: string;
  description: string;
  vertical: VerticalType | "universal";
  steps: SequenceStep[];
  totalDays: number;
  complianceScore: number; // 0-100
}

// Sequence presets cleared - build fresh per client
export const SEQUENCE_EXAMPLE_PRESETS: SequencePreset[] = [];

// ============================================
// COMPLIANCE RULES
// ============================================

/**
 * NEXTIER COMPLIANCE & EXECUTION RULES
 *
 * Philosophy: Stopping is a feature, not a failure
 * Model: 5 attempts per cartridge (Authority→Curiosity→Direct→Humor→Final)
 * Goal: Turn repetition into learning, learning into inbound demand
 */
export const COMPLIANCE_RULES = {
  // Character limits - single SMS segment
  maxCharacterCount: 160, // Single SMS = lower cost, better delivery
  softMaxCharCount: 140, // Leave room for variable expansion

  // Attempt discipline - hard stop after 5
  maxAttemptsPerCartridge: 5,
  minMessageSpacingHours: 24,
  maxMessagesBeforeEscalation: 3,

  // Tone escalation sequence
  toneSequence: ["authority", "curiosity", "direct", "humor", "final"],

  // Business hours
  businessHoursStart: 9, // 9 AM
  businessHoursEnd: 20, // 8 PM
  allowWeekends: false,

  // Compliance keywords
  requiredOptOut: true,
  stopKeywords: ["STOP", "UNSUBSCRIBE", "CANCEL", "QUIT", "END", "REMOVE"],
  positiveKeywords: [
    "yes",
    "interested",
    "tell me more",
    "sure",
    "ok",
    "sounds good",
    "call me",
    "send it",
    "email",
  ],
  negativeKeywords: [
    "no",
    "not interested",
    "remove",
    "wrong number",
    "stop",
    "leave me alone",
  ],

  // Season model
  monthlyTargetDefault: 20000,

  // AI boundaries - what AI can NEVER do
  aiHardLimits: {
    canSendMessages: false,
    canChangeStages: false,
    canRewriteTemplates: false,
    canIgnoreStop: false,
    canActWithoutApproval: false,
  },
};

// ============================================
// DISCOVERY CALL EMAIL TEMPLATE
// ============================================

export const DISCOVERY_CALL_EMAIL = {
  subject: "Quick call about {companyName}?",
  body: `Hi {firstName},

Thanks for getting back to me! I'd love to tell you more about how we help {industry} businesses like yours.

I'm Thomas, founder of Nextier Technologies. Let's do a quick 16-minute discovery call to see if we're a fit.

Book a time that works for you:
{calendarLink}

Talk soon,
Thomas Borruso
Founder, Nextier Technologies
admin@outreachglobal.ai`,
  variables: ["firstName", "companyName", "industry", "calendarLink"],
};

// ============================================
// EXPORTS - EXAMPLE TEMPLATES FOR REFERENCE
// ============================================
// These are NOT loaded into client accounts.
// Use these as patterns when building client-specific templates.

/**
 * ALL_EXAMPLE_TEMPLATES - Combined example templates for reference
 * Not auto-loaded into any client account.
 */
export const ALL_EXAMPLE_TEMPLATES: SmsTemplate[] = [
  ...GIANNA_EXAMPLE_TEMPLATES,
  ...CATHY_EXAMPLE_TEMPLATES,
  ...SABRINA_EXAMPLE_TEMPLATES,
  ...BREAKUP_EXAMPLE_TEMPLATES,
];

/**
 * Helper to filter example templates by worker type
 * Use for reference when building client templates
 */
export function getExampleTemplatesByWorker(worker: WorkerType): SmsTemplate[] {
  return ALL_EXAMPLE_TEMPLATES.filter((t) => t.worker === worker);
}

/**
 * Helper to filter example templates by vertical
 * Use for reference when building client templates
 */
export function getExampleTemplatesByVertical(
  vertical: VerticalType | "universal",
): SmsTemplate[] {
  return ALL_EXAMPLE_TEMPLATES.filter(
    (t) => t.vertical === vertical || t.vertical === "universal",
  );
}

/**
 * Helper to filter example templates by category
 * Use for reference when building client templates
 */
export function getExampleTemplatesByCategory(
  category: TemplateCategory,
): SmsTemplate[] {
  return ALL_EXAMPLE_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Helper to get example sequence presets by vertical
 * Use as reference for building client cartridges
 */
export function getExamplePresetsByVertical(
  vertical: VerticalType | "universal",
): SequencePreset[] {
  return SEQUENCE_EXAMPLE_PRESETS.filter(
    (p) => p.vertical === vertical || p.vertical === "universal",
  );
}

// Worker metadata
export const WORKER_META = {
  gianna: {
    name: "GIANNA",
    role: "Opener",
    color: "purple",
    icon: "Zap",
    description:
      "First contact specialist. Warm introductions and initial engagement.",
  },
  cathy: {
    name: "CATHY",
    role: "Nudger",
    color: "orange",
    icon: "Bell",
    description: "Follow-up expert. Humor-infused nudges and value drops.",
  },
  sabrina: {
    name: "SABRINA",
    role: "Closer",
    color: "green",
    icon: "Calendar",
    description: "Booking specialist. Handles objections and confirms calls.",
  },
} as const;
