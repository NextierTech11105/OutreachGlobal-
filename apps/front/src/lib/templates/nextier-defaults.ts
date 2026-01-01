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

const GIANNA_EXAMPLE_TEMPLATES: SmsTemplate[] = [
  // CRM CONSULTANT VERTICAL - All under 160 chars
  {
    id: "gianna-crm-intro-1",
    name: "CRM Consultant Opener",
    content:
      "Hi {firstName}, {companyName} caught my eye. We help consultants automate lead gen. Using any outreach automation? Best email?",
    category: "initial",
    worker: "gianna",
    vertical: "crm-consultant",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 130,
  },
  {
    id: "gianna-crm-value-1",
    name: "CRM Value Proposition",
    content:
      "{firstName} - consultants in {city} are booking 3-5 extra calls/week on autopilot. 15-min chat? Best email for {companyName}?",
    category: "initial",
    worker: "gianna",
    vertical: "crm-consultant",
    variables: ["firstName", "city", "companyName"],
    complianceApproved: true,
    characterCount: 132,
  },

  // BUSINESS BROKER VERTICAL - All under 160 chars
  {
    id: "gianna-broker-intro-1",
    name: "Business Broker Opener",
    content:
      "{firstName}, thinking about your exit strategy for {companyName}? We help trades maximize value. Is this on your radar?",
    category: "initial",
    worker: "gianna",
    vertical: "business-broker",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 126,
  },
  {
    id: "gianna-broker-exit-1",
    name: "Exit Strategy Intro",
    content:
      "{firstName}, know what {companyName} is worth? Most {industry} owners leave 20-40% on the table. Want a quick valuation?",
    category: "initial",
    worker: "gianna",
    vertical: "business-broker",
    variables: ["firstName", "companyName", "industry"],
    complianceApproved: true,
    characterCount: 125,
  },

  // REAL ESTATE VERTICAL - All under 160 chars
  {
    id: "gianna-realestate-intro-1",
    name: "Real Estate Agent Opener",
    content:
      "{firstName}, top agents in {city} are getting 10-15 seller leads/month without cold calling. Quick chat? Best email?",
    category: "initial",
    worker: "gianna",
    vertical: "real-estate",
    variables: ["firstName", "city"],
    complianceApproved: true,
    characterCount: 120,
  },
  {
    id: "gianna-realestate-tech-1",
    name: "Real Estate Tech Advantage",
    content:
      "{firstName}, agents in {state} are closing 2-3 more listings/quarter with our AI. The tech prospects while you show. Worth 15 min?",
    category: "initial",
    worker: "gianna",
    vertical: "real-estate",
    variables: ["firstName", "state"],
    complianceApproved: true,
    characterCount: 135,
  },

  // ALTERNATIVE LENDING VERTICAL - Under 160 chars
  {
    id: "gianna-lending-intro-1",
    name: "Alt Lending Opener",
    content:
      "{firstName}, {companyName} may qualify for growth capital most owners don't know about. Exploring any financing options?",
    category: "initial",
    worker: "gianna",
    vertical: "alternative-lending",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 126,
  },

  // EXIT & EXPANSION TEMPLATES - New category
  {
    id: "gianna-exit-valuation-1",
    name: "Valuation Curiosity",
    content:
      "Hey {firstName}, ever wonder what {companyName} could sell for? I can get you a valuation. Best email?",
    category: "exit-expansion",
    worker: "gianna",
    vertical: "business-broker",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 104,
  },
  {
    id: "gianna-exit-hidden-value-1",
    name: "Hidden Value",
    content:
      "{firstName}, most owners have no idea what they're sitting on. Want a quick valuation? Best email to send it?",
    category: "exit-expansion",
    worker: "gianna",
    vertical: "business-broker",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 112,
  },
  {
    id: "gianna-exit-expand-1",
    name: "Expand or Exit",
    content:
      "Thinking about expanding or exiting {companyName}? I can get you a clean valuation. What's a good email, {firstName}?",
    category: "exit-expansion",
    worker: "gianna",
    vertical: "business-broker",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 120,
  },
  {
    id: "gianna-exit-know-number-1",
    name: "Know Your Number",
    content:
      "Curious {firstName} — do you know what {companyName} would sell for right now? I can show you. Best email?",
    category: "exit-expansion",
    worker: "gianna",
    vertical: "business-broker",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 108,
  },
  {
    id: "gianna-exit-tomorrow-1",
    name: "Tomorrow's Offer",
    content:
      "If someone made you an offer tomorrow {firstName} — do you know your number? I can get you a valuation. Email?",
    category: "exit-expansion",
    worker: "gianna",
    vertical: "business-broker",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 113,
  },
  {
    id: "gianna-exit-horizon-1",
    name: "1-2 Year Horizon",
    content:
      "{firstName}, thinking expansion or exit in the next year or two? I can get you a valuation for {companyName}. Email?",
    category: "exit-expansion",
    worker: "gianna",
    vertical: "business-broker",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 120,
  },
  {
    id: "gianna-exit-this-week-1",
    name: "This Week",
    content:
      "I can run your business valuation this week {firstName}. Want it? What's the best email for you?",
    category: "exit-expansion",
    worker: "gianna",
    vertical: "business-broker",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 100,
  },
  {
    id: "gianna-exit-market-value-1",
    name: "Market Value",
    content:
      "{firstName}, do you know {companyName}'s current market value? I can get it for you. Best email?",
    category: "exit-expansion",
    worker: "gianna",
    vertical: "business-broker",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 100,
  },

  // UNIVERSAL TEMPLATES - Under 160 chars
  {
    id: "gianna-universal-intro-1",
    name: "Generic Professional Opener",
    content:
      "Hi {firstName}, came across {companyName}. We help {industry} businesses grow via automated outreach. Open to a quick chat?",
    category: "initial",
    worker: "gianna",
    vertical: "universal",
    variables: ["firstName", "companyName", "industry"],
    complianceApproved: true,
    characterCount: 128,
  },
];

// ============================================
// CATHY TEMPLATES (Nudger) - EXAMPLES ONLY
// ============================================
// Demonstrates tone escalation: Authority → Curiosity → Direct → Humor → Final

const CATHY_EXAMPLE_TEMPLATES: SmsTemplate[] = [
  // TONE ESCALATION: Authority → Curiosity → Direct → Humor → Final
  // All under 160 chars

  // AUTHORITY NUDGES (Attempt 2)
  {
    id: "cathy-nudge-authority-1",
    name: "Authority Check-in",
    content:
      "{firstName}, following up on my message. We've helped {industry} companies grow 40%+ with our system. Worth a quick look?",
    category: "nudge",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName", "industry"],
    complianceApproved: true,
    characterCount: 124,
  },

  // CURIOSITY NUDGES (Attempt 3)
  {
    id: "cathy-nudge-curiosity-1",
    name: "Curiosity Hook",
    content:
      "{firstName} - what if I told you we could add 5+ leads/week to your pipeline on autopilot? That's what we did last month.",
    category: "nudge",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 124,
  },
  {
    id: "cathy-nudge-curiosity-2",
    name: "Hidden Insight",
    content:
      "Quick question {firstName} — do you know what your competitors are doing for lead gen? I can share what's working in {industry}.",
    category: "nudge",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName", "industry"],
    complianceApproved: true,
    characterCount: 135,
  },

  // DIRECT NUDGES (Attempt 4)
  {
    id: "cathy-nudge-direct-1",
    name: "Direct Ask",
    content:
      "{firstName}, straight up — is this worth 15 min to explore? If not, just say so. If yes, I'll get you on with Thomas.",
    category: "nudge",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 120,
  },
  {
    id: "cathy-nudge-direct-2",
    name: "Cut to Chase",
    content:
      "Hey {firstName}, I'll be direct: yes or no on a 15-min discovery call? Either answer works for me.",
    category: "nudge",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 99,
  },

  // HUMOR NUDGES (Attempt 5 - before final)
  {
    id: "cathy-nudge-humor-1",
    name: "Light Humor",
    content:
      "{firstName} — promise I'm not a robot. Just checking if you saw my note. Worth a quick call to chat {industry} growth?",
    category: "nudge",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName", "industry"],
    complianceApproved: true,
    characterCount: 121,
  },
  {
    id: "cathy-nudge-humor-2",
    name: "Self-Aware",
    content:
      "I know you're slammed {firstName}. Last nudge, I promise. 15 min with Thomas could be the best ROI of your week.",
    category: "nudge",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 116,
  },

  // RETARGET TEMPLATES - Context-aware follow-up
  {
    id: "cathy-retarget-1",
    name: "New Angle",
    content:
      "{firstName}, circling back with a different angle. If timing wasn't right before, happy to try again. Curious?",
    category: "retarget",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 112,
  },
  {
    id: "cathy-retarget-casestudy-1",
    name: "Case Study Drop",
    content:
      "{firstName} — just helped a {industry} company in {state} boost booked calls 47%. Thought of {companyName}. Want the playbook?",
    category: "retarget",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName", "industry", "state", "companyName"],
    complianceApproved: true,
    characterCount: 130,
  },

  // VALUE DROPS
  {
    id: "cathy-value-roi-1",
    name: "ROI Value Drop",
    content:
      "{firstName} — clients see 340% ROI in 90 days. Happy to show you the numbers if you're curious.",
    category: "value-drop",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 99,
  },
];

// ============================================
// SABRINA TEMPLATES (Closer/Booker) - EXAMPLES ONLY
// ============================================
// Demonstrates booking and objection handling patterns

const SABRINA_EXAMPLE_TEMPLATES: SmsTemplate[] = [
  // CLOSER TEMPLATES - Goal: 15-min discovery call with Thomas
  // All under 160 chars

  // BOOKING TEMPLATES
  {
    id: "sabrina-book-direct-1",
    name: "Direct Booking Ask",
    content:
      "{firstName}, let's get you 15 min with Thomas (our founder). He'll show you the system. Calendar: {calendarLink}",
    category: "closer",
    worker: "sabrina",
    vertical: "universal",
    variables: ["firstName", "calendarLink"],
    complianceApproved: true,
    characterCount: 115,
  },
  {
    id: "sabrina-book-confirm-1",
    name: "Confirmation Request",
    content:
      "{firstName}, confirming your call with Thomas this week. He's looking forward to learning more about {companyName}!",
    category: "closer",
    worker: "sabrina",
    vertical: "universal",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 118,
  },
  {
    id: "sabrina-book-urgency-1",
    name: "This Week Slot",
    content:
      "{firstName}, Thomas has a slot open Thursday. 15 min, no pitch — just seeing if there's a fit. Want it?",
    category: "closer",
    worker: "sabrina",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 108,
  },

  // OBJECTION HANDLERS
  {
    id: "sabrina-objection-time-1",
    name: "Time Objection",
    content:
      "Get it {firstName}, you're slammed. Call is only 15 min — Thomas respects your time. Next week? {calendarLink}",
    category: "closer",
    worker: "sabrina",
    vertical: "universal",
    variables: ["firstName", "calendarLink"],
    complianceApproved: true,
    characterCount: 114,
  },
  {
    id: "sabrina-objection-interest-1",
    name: "Interest Check",
    content:
      "No worries {firstName}! Quick q — is it timing, or is your current lead gen working? Genuinely curious.",
    category: "closer",
    worker: "sabrina",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 106,
  },
  {
    id: "sabrina-objection-busy-1",
    name: "Busy Handler",
    content:
      "{firstName}, totally understand busy. What if I send a 2-min video first? If it resonates, we book. Fair?",
    category: "closer",
    worker: "sabrina",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 109,
  },

  // CALLBACK RESPONSES - Inbound reply handling
  {
    id: "sabrina-callback-positive-1",
    name: "Positive Response",
    content:
      "Great {firstName}! Let's get you on with Thomas — 15 min. Pick a time: {calendarLink}",
    category: "callback",
    worker: "sabrina",
    vertical: "universal",
    variables: ["firstName", "calendarLink"],
    complianceApproved: true,
    characterCount: 89,
  },
  {
    id: "sabrina-callback-email-1",
    name: "Email Captured",
    content:
      "Got it {firstName}! Sending the valuation info to that email now. Thomas will follow up to schedule a quick call.",
    category: "callback",
    worker: "sabrina",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 115,
  },
  {
    id: "sabrina-callback-question-1",
    name: "Question Handler",
    content:
      "Great question {firstName}. Thomas can walk you through that on a 15-min call. When works? {calendarLink}",
    category: "callback",
    worker: "sabrina",
    vertical: "universal",
    variables: ["firstName", "calendarLink"],
    complianceApproved: true,
    characterCount: 109,
  },
];

// ============================================
// BREAKUP TEMPLATES - EXAMPLES ONLY
// ============================================
// Final messages before holstering - "Stopping is a feature, not a failure"

const BREAKUP_EXAMPLE_TEMPLATES: SmsTemplate[] = [
  // FINAL/HOLSTER TEMPLATES (Attempt 5) - All under 160 chars
  // Stopping is a feature, not a failure
  {
    id: "breakup-graceful-1",
    name: "Graceful Exit",
    content:
      "Last note {firstName} — don't want to be a pest. If you ever want to chat {industry} growth, reply YES and I'll reach out. Take care!",
    category: "breakup",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName", "industry"],
    complianceApproved: true,
    characterCount: 138,
  },
  {
    id: "breakup-door-open-1",
    name: "Door Open Exit",
    content:
      "Signing off {firstName}. Door's always open if {companyName} ever needs lead gen help. Wishing you the best!",
    category: "breakup",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 112,
  },
  {
    id: "breakup-respectful-1",
    name: "Respectful Close",
    content:
      "{firstName}, I respect your time. This is my final message. If things change, I'm here. All the best to you and {companyName}.",
    category: "breakup",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 128,
  },
  {
    id: "breakup-simple-1",
    name: "Simple Close",
    content:
      "Final message {firstName}. No hard feelings — timing is everything. If you need us, we're here.",
    category: "breakup",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 99,
  },
];

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

export const SEQUENCE_EXAMPLE_PRESETS: SequencePreset[] = [
  {
    id: "preset-crm-opener",
    name: "CRM Consultant Opener",
    description: "Standard opener sequence for CRM consultant partnerships",
    vertical: "crm-consultant",
    steps: [
      { id: "step-1", type: "sms", templateId: "gianna-crm-intro-1" },
      { id: "step-2", type: "wait", waitDays: 2 },
      { id: "step-3", type: "sms", templateId: "gianna-crm-value-1" },
      { id: "step-4", type: "wait", waitDays: 3 },
      {
        id: "step-5",
        type: "condition",
        condition: {
          type: "no-response",
          threshold: 120, // 5 days
          thenAction: "escalate",
          escalateTo: "cathy",
        },
      },
      { id: "step-6", type: "sms", templateId: "cathy-nudge-friendly-1" },
      { id: "step-7", type: "wait", waitDays: 2 },
      { id: "step-8", type: "sms", templateId: "cathy-nudge-humor-1" },
      { id: "step-9", type: "wait", waitDays: 3 },
      {
        id: "step-10",
        type: "condition",
        condition: {
          type: "replied",
          thenAction: "escalate",
          escalateTo: "sabrina",
        },
      },
    ],
    totalDays: 10,
    complianceScore: 95,
  },
  {
    id: "preset-broker-trades",
    name: "Business Broker Trades",
    description: "Exit strategy outreach for plumbing/HVAC business owners",
    vertical: "business-broker",
    steps: [
      { id: "step-1", type: "sms", templateId: "gianna-broker-intro-1" },
      { id: "step-2", type: "wait", waitDays: 1 },
      { id: "step-3", type: "sms", templateId: "gianna-broker-exit-1" },
      { id: "step-4", type: "wait", waitDays: 3 },
      {
        id: "step-5",
        type: "condition",
        condition: {
          type: "no-response",
          threshold: 96, // 4 days
          thenAction: "escalate",
          escalateTo: "cathy",
        },
      },
      { id: "step-6", type: "sms", templateId: "cathy-retarget-casestudy-1" },
      { id: "step-7", type: "wait", waitDays: 2 },
      { id: "step-8", type: "sms", templateId: "breakup-graceful-1" },
      {
        id: "step-9",
        type: "condition",
        condition: {
          type: "replied",
          thenAction: "escalate",
          escalateTo: "sabrina",
        },
      },
    ],
    totalDays: 8,
    complianceScore: 92,
  },
  {
    id: "preset-realestate-agent",
    name: "Real Estate Agent",
    description: "Lead gen outreach for real estate agents",
    vertical: "real-estate",
    steps: [
      { id: "step-1", type: "sms", templateId: "gianna-realestate-intro-1" },
      { id: "step-2", type: "wait", waitDays: 2 },
      { id: "step-3", type: "sms", templateId: "gianna-realestate-tech-1" },
      { id: "step-4", type: "wait", waitDays: 3 },
      {
        id: "step-5",
        type: "condition",
        condition: {
          type: "no-response",
          threshold: 120,
          thenAction: "escalate",
          escalateTo: "cathy",
        },
      },
      { id: "step-6", type: "sms", templateId: "cathy-nudge-curiosity-1" },
      { id: "step-7", type: "wait", waitDays: 2 },
      { id: "step-8", type: "sms", templateId: "cathy-value-roi-1" },
      { id: "step-9", type: "wait", waitDays: 3 },
      {
        id: "step-10",
        type: "condition",
        condition: {
          type: "replied",
          thenAction: "escalate",
          escalateTo: "sabrina",
        },
      },
      { id: "step-11", type: "sms", templateId: "breakup-door-open-1" },
    ],
    totalDays: 12,
    complianceScore: 90,
  },
];

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
  negativeKeywords: ["no", "not interested", "remove", "wrong number", "stop", "leave me alone"],

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
