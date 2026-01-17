/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NEXTIER PLATFORM CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * Shared configuration values used across the platform.
 * Import these instead of hardcoding values in components.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

/** Maximum number of leads to skip trace per day */
export const DAILY_SKIP_TRACE_LIMIT = 2000;

/** Number of leads processed per batch operation */
export const BATCH_SIZE = 250;

/** Maximum leads per campaign bucket */
export const CAMPAIGN_BUCKET_SIZE = 2000;

/** Target number of enriched leads per month */
export const MONTHLY_POOL_TARGET = 20000;

// ═══════════════════════════════════════════════════════════════════════════════
// 10DLC REGISTRATION - CJRCU60 (Approved 01/06/2026)
// ═══════════════════════════════════════════════════════════════════════════════

export const SIGNALHOUSE_10DLC = {
  campaignId: "CJRCU60",
  brandId: "BZOYPIH",
  brandName: "NEXTIER",
  status: "APPROVED",
  useCase: "LOW_VOLUME",
  expirationDate: "2026-04-06",
  registeredOn: "2026-01-06",

  // Phone number assigned to GIANNA
  phoneNumber: "+15164079249",
  assignedWorker: "GIANNA",

  // SignalHouse Group/Subgroup
  groupId: "GM7CEB",
  subgroupId: "S7ZI7S",
  subgroupName: "Default Sub Group",

  // Carrier rate limits (texts per minute)
  carrierLimits: {
    att: { smsTPM: 75, mmsTPM: 50, messageClass: "T", tpmScope: "CAMPAIGN" },
    tmobile: { brandTier: "LOW", brandDailyCap: true },
    verizon: { status: "REGISTERED", electedDCA: true },
    uscc: { status: "REGISTERED", electedDCA: true },
    clearsky: { status: "REGISTERED", electedDCA: true },
    interop: { status: "REGISTERED", electedDCA: true },
  },

  // 10DLC Campaign Attributes
  attributes: {
    subscriberOptIn: true,
    subscriberOptOut: true,
    subscriberHelp: true,
    numberPooling: false,
    embeddedLink: true, // Links allowed!
    embeddedPhone: false,
    ageGated: false,
  },

  // Required compliance - matches 10DLC registration
  compliance: {
    optOutText: "Respond STOP to opt out from NEXTIER",
    helpText: "Reply HELP for more information",
    brandName: "NEXTIER",
  },

  // Pre-approved sample messages from 10DLC
  sampleMessages: [
    "We think you'll love our new release, let's book a call and discuss soon! Respond STOP to opt out from NEXTIER",
    "We're here to save you time AND money. Let me know when you're free for a quick call. Respond STOP to opt out from NEXTIER",
  ],

  // Links
  links: {
    privacyPolicy:
      "https://nextier.signalhouse.io/intake/LDZH8OR/privacy-policy",
    termsConditions:
      "https://nextier.signalhouse.io/intake/LDZH8OR/terms-service",
    website: "https://nextier.signalhouse.io/intake/LDZH8OR",
  },

  // Campaign description
  description:
    "Send first-party Marketing messages offered directly by the messaging party. NEXTIER is a Consultant that provides products and services to customers in the Professional Services industry.",

  // SignalHouse Tier 2 Aggregator Capabilities
  tier2: {
    deliveryTime: "<1 second",
    deliverability: "99%",
    autoScaling: true,
    directCarrierGateways: true,
    redundancy: true,
    realTimeAnalytics: true,
    // Zero downtime switching
    seamlessTransition: true,
    // Metrics visibility
    metrics: ["created", "queued", "dequeued", "sent", "delivered"],
    // Filtering options
    filterBy: ["number", "brand", "campaign", "carrier", "tag", "status"],
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SMS RATE LIMITS (Based on 10DLC approval)
// ═══════════════════════════════════════════════════════════════════════════════

/** Messages per minute limit (AT&T TPM = 75) */
export const SMS_RATE_LIMIT_PER_MINUTE = 75;

/** Messages per second (75 TPM / 60 = 1.25/sec, round down for safety) */
export const SMS_RATE_LIMIT_PER_SECOND = 1;

/** Delay between sends in ms (1 per second = 1000ms) */
export const SMS_SEND_DELAY_MS = 1000;

/** Daily SMS limit per phone number (10DLC LOW_VOLUME) */
export const DAILY_SMS_LIMIT_PER_NUMBER = 2000;

/** SMS segment size (characters) */
export const SMS_SEGMENT_SIZE = 160;

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER TIMING
// ═══════════════════════════════════════════════════════════════════════════════

/** Days before lead is flagged as ghost (non-responder) */
export const GHOST_THRESHOLD_DAYS = 3;

/** Nudge sequence timing (days after initial contact) */
export const NUDGE_SEQUENCE_DAYS = [3, 7, 14, 30] as const;

/** Hours before appointment for reminders */
export const REMINDER_HOURS = [24, 2] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGN BUCKETS
// ═══════════════════════════════════════════════════════════════════════════════

export const CAMPAIGN_BUCKET_TYPES = [
  "initial",
  "retarget",
  "nurture",
  "followup",
  "nudge",
  "book_appointment",
] as const;

export type CampaignBucketType = (typeof CAMPAIGN_BUCKET_TYPES)[number];

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD STAGES
// ═══════════════════════════════════════════════════════════════════════════════

export const LEAD_STAGES = [
  "new",
  "contacted",
  "engaged",
  "qualified",
  "appointment_set",
  "no_response",
  "not_interested",
  "dnc",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

// ═══════════════════════════════════════════════════════════════════════════════
// INBOX CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

export const INBOX_CLASSIFICATIONS = [
  "UNCLASSIFIED",
  "POSITIVE",
  "NEGATIVE",
  "QUESTION",
  "OBJECTION",
  "BOOKING_REQUEST",
  "RESCHEDULE",
  "CANCELLATION",
  "SPAM",
] as const;

export type InboxClassification = (typeof INBOX_CLASSIFICATIONS)[number];

export const INBOX_PRIORITIES = ["HOT", "WARM", "COLD"] as const;

export type InboxPriority = (typeof INBOX_PRIORITIES)[number];

// ═══════════════════════════════════════════════════════════════════════════════
// TRACERFY SKIP TRACING (for phone/email enrichment)
// ═══════════════════════════════════════════════════════════════════════════════

/** Cost per lead for normal skip trace (phones + emails) - B2B sweet spot */
export const TRACERFY_COST_PER_LEAD = 0.02;

/** Cost per lead for enhanced skip trace (+ relatives, businesses, aliases) */
export const TRACERFY_ENHANCED_COST_PER_LEAD = 0.15;

/** Average match rate for skip tracing */
export const TRACERFY_MATCH_RATE = 0.85;

/** Max phone numbers returned per lead */
export const TRACERFY_MAX_PHONES = 8;

/** Max emails returned per lead */
export const TRACERFY_MAX_EMAILS = 3;

/** Processing time estimate (minutes) */
export const TRACERFY_PROCESSING_TIME_MINUTES = 15;

// ═══════════════════════════════════════════════════════════════════════════════
// TRESTLE REAL CONTACT API (for phone/email verification + contactability scoring)
// ═══════════════════════════════════════════════════════════════════════════════

/** Cost per contact verification via Trestle Real Contact API */
export const TRESTLE_COST_PER_CONTACT = 0.03;

/** Combined cost: Tracerfy skip trace + Trestle validation */
export const TOTAL_ENRICHMENT_COST_PER_LEAD =
  TRACERFY_COST_PER_LEAD + TRESTLE_COST_PER_CONTACT; // $0.05

/** Activity score threshold - 70+ means phone is connected and active */
export const TRESTLE_GOOD_ACTIVITY_SCORE = 70;

/** Activity score threshold - 30 or below means phone is likely disconnected */
export const TRESTLE_BAD_ACTIVITY_SCORE = 30;

/** Contact grades that pass verification (A, B, C are acceptable) */
export const TRESTLE_PASSING_GRADES = ["A", "B", "C"] as const;

/** Failing contact grades (D and F should be deprioritized) */
export const TRESTLE_FAILING_GRADES = ["D", "F"] as const;

/** Default add-ons to request (litigator check is critical for TCPA) */
export const TRESTLE_DEFAULT_ADDONS = [
  "litigator_checks",
  "email_checks_deliverability",
] as const;

/** Trestle line types */
export const TRESTLE_LINE_TYPES = [
  "Mobile",
  "Landline",
  "FixedVOIP",
  "NonFixedVOIP",
  "Premium",
  "TollFree",
  "Voicemail",
  "Other",
] as const;

export type TrestleLineType = (typeof TRESTLE_LINE_TYPES)[number];

/** Line types that are SMS-capable */
export const TRESTLE_SMS_CAPABLE_TYPES: TrestleLineType[] = ["Mobile"];

/** Line types that may work for SMS but with caveats */
export const TRESTLE_SMS_MAYBE_TYPES: TrestleLineType[] = [
  "FixedVOIP",
  "NonFixedVOIP",
];

// ═══════════════════════════════════════════════════════════════════════════════
// THE LOOP - 30-Day Relentless Intent Path
// ═══════════════════════════════════════════════════════════════════════════════
//
// PHILOSOPHY:
// - Loops are PATHS that get carved out and shaped
// - MANUFACTURE responses through conversational auto-respond
// - SCALE visibility with high-capability intent messaging
// - RELENTLESS INTENT inside 30 days → 15-min meeting
//
// The loop IS the campaign. Every vertical goes through THE LOOP.
//

export const THE_LOOP = {
  // 30-day lifecycle
  LIFECYCLE_DAYS: 30,

  // Touch sequence (relentless but strategic)
  TOUCH_SCHEDULE: [1, 3, 5, 7, 10, 14, 21, 28, 30] as const, // Days to touch

  // Goal: 15-min intent meeting
  GOAL: "15_MIN_INTENT_MEETING",

  // Response manufacturing
  AUTO_RESPOND: {
    enabled: true,
    conversational: true,
    intentional: true,
    maxAutoReplies: 5, // Before human handoff
  },

  // Visibility scaling
  SCALE: {
    dailyNewLeads: 2000,
    activeInLoop: 20000, // Target active at any time
    monthlyCapacity: 60000, // 2K/day * 30 days
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGN MACROS - Verticals that flow through THE LOOP
// ═══════════════════════════════════════════════════════════════════════════════

export const CAMPAIGN_MACROS = {
  B2B: {
    id: "b2b",
    name: "B2B Decision Makers",
    targetPool: 20000,
    dailyOutbound: 2000,
    description: "Business decision makers - CEOs, Owners, Directors",
    audiences: ["ceos", "owners", "directors", "founders", "presidents"],
    signalhouseCampaignId: process.env.SIGNALHOUSE_B2B_CAMPAIGN_ID || "CW7I6X5",
    loopConfig: THE_LOOP,
  },
  REAL_ESTATE_TECH: {
    id: "real_estate_tech",
    name: "Real Estate Technology",
    targetPool: 20000,
    dailyOutbound: 2000,
    description: "Real estate professionals - Agents, Brokers, Investors",
    audiences: [
      "agents",
      "brokers",
      "investors",
      "property_managers",
      "realtors",
    ],
    signalhouseCampaignId: process.env.SIGNALHOUSE_RE_CAMPAIGN_ID || "CW7I6X5",
    loopConfig: THE_LOOP,
  },
} as const;

export type CampaignMacroId = keyof typeof CAMPAIGN_MACROS;

/** Stage 1 stabilization target per macro */
export const MACRO_STABILIZATION_TARGET = 20000;

/** Combined daily outbound capacity (both macros) */
export const TOTAL_DAILY_OUTBOUND_CAPACITY = 4000;

// ═══════════════════════════════════════════════════════════════════════════════
// INSTANT EXECUTION CONFIG - 10DLC Compliant Rate Limits
// ═══════════════════════════════════════════════════════════════════════════════

export const INSTANT_EXECUTION = {
  /** Max leads per instant batch (keeps UI responsive) */
  BATCH_SIZE: 75, // Match AT&T TPM limit

  /** Delay between sends (ms) - 75 TPM = 1.25/sec = 800ms minimum */
  SEND_DELAY_MS: 1000, // 1 per second for safety margin

  /** Preview timeout before auto-execute (ms) - 3 seconds for review */
  PREVIEW_TIMEOUT_MS: 3000,

  /** Show success animation duration (ms) */
  SUCCESS_ANIMATION_MS: 500,

  /** Enable instant mode by default */
  DEFAULT_INSTANT_MODE: true,

  /** Max SMS per hour (carrier safe) */
  MAX_PER_HOUR: 4500, // 75 TPM * 60 minutes

  /** Max SMS per day (10DLC LOW_VOLUME) */
  MAX_PER_DAY: 2000,

  /** Compliance - must include in every message */
  REQUIRED_SUFFIX: "Reply STOP to opt out -NEXTIER",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS (for reference)
// ═══════════════════════════════════════════════════════════════════════════════

export const API_ENDPOINTS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // CORE EXECUTION CHAIN
  // ═══════════════════════════════════════════════════════════════════════════
  executionChain: "/api/execution-chain",
  campaignIntents: "/api/campaigns/intents",

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA IMPORT + ENRICHMENT (Tracerfy $0.02/lead + Trestle $0.03/lead)
  // ═══════════════════════════════════════════════════════════════════════════
  leadsImport: "/api/leads/import",
  enrich: "/api/enrich",
  skipTrace: "/api/skip-trace",
  tracerfyTrace: "/api/skip-trace/tracerfy",
  tracerfyWebhook: "/api/skip-trace/tracerfy/webhook",
  trestleValidation: "/api/validation/trestle", // Trestle Real Contact API

  // ═══════════════════════════════════════════════════════════════════════════
  // SMS CAMPAIGN (SignalHouse)
  // ═══════════════════════════════════════════════════════════════════════════
  smsConversations: "/api/sms/conversations",
  smsSend: "/api/sms/send",
  smsWebhook: "/api/sms/webhook",
  scheduler: "/api/scheduler",

  // ═══════════════════════════════════════════════════════════════════════════
  // AI COPILOT (Response Classification + Routing)
  // ═══════════════════════════════════════════════════════════════════════════
  copilot: "/api/copilot",
  callQueue: "/api/copilot/call-queue",

  // ═══════════════════════════════════════════════════════════════════════════
  // MEETING + RESEARCH (Perplexity on booking)
  // ═══════════════════════════════════════════════════════════════════════════
  calendlyWebhook: "/api/calendly/webhook",
  deepResearch: "/api/research/deep",

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKER APIs
  // ═══════════════════════════════════════════════════════════════════════════
  digitalWorkerStats: "/api/digital-workers/stats",
  nevaResearch: "/api/neva/research",
  luciEnrich: "/api/luci/enrich",
  luciScan: "/api/luci/scan",

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA APIs
  // ═══════════════════════════════════════════════════════════════════════════
  buckets: "/api/buckets",
  propertySearch: "/api/properties/search",
  campaigns: "/api/campaigns",
  workflows: "/api/workflows",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CORE EXECUTION FLOW
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// GIANNA WORKER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
//
// GIANNA is the Opener - handles outbound SMS and inbound copilot responses
// Assigned to phone: +15164079249 (10DLC CJRCU60)
//

export const GIANNA_CONFIG = {
  name: "GIANNA",
  role: "Opener",
  description:
    "AI SMS Worker - Handles outbound campaigns and inbound response copilot",

  // Phone assignment
  phone: SIGNALHOUSE_10DLC.phoneNumber,
  campaignId: SIGNALHOUSE_10DLC.campaignId,

  // Copilot settings
  copilot: {
    enabled: true,
    autoRespond: true,
    preApprovedTemplates: true,
    maxAutoReplies: 5, // Before human handoff
    handleClassifications: ["QUESTION", "NEUTRAL", "POSITIVE"],
    escalateTo: {
      OBJECTION: "CATHY",
      BOOKING_REQUEST: "SABRINA",
      NEGATIVE: "CATHY",
    },
  },

  // THE LOOP integration
  loop: {
    days: [1, 3, 5, 7], // Day 1-7 opener phase
    stage: "opener",
    intent: "DISCOVERY",
  },

  // Pre-approved templates (10DLC compliant)
  templates: {
    opener: [
      "We think you'll love our new release, let's book a call and discuss soon! Respond STOP to opt out from NEXTIER",
      "We're here to save you time AND money. Let me know when you're free for a quick call. Respond STOP to opt out from NEXTIER",
      "Hi {firstName}, quick question - are you open to a 15-min call this week? Respond STOP to opt out from NEXTIER",
    ],
    followUp: [
      "Hey {firstName}, circling back - still interested in that chat? Respond STOP to opt out from NEXTIER",
      "Hi {firstName}, just checking in. When works for a quick call? Respond STOP to opt out from NEXTIER",
    ],
    questionResponse: [
      "Great question! {answer} Would a quick call help? Respond STOP to opt out from NEXTIER",
      "Happy to explain! {answer} Let's connect: {link} Respond STOP to opt out from NEXTIER",
    ],
    bookingConfirm: [
      "Perfect! Here's my calendar: {link} Looking forward to it! Respond STOP to opt out from NEXTIER",
    ],
  },

  // Response patterns
  patterns: {
    positive: ["yes", "sure", "interested", "tell me more", "sounds good"],
    booking: ["book", "schedule", "call", "when", "available", "calendar"],
    question: ["how", "what", "why", "who", "when", "which", "?"],
    objection: ["busy", "later", "maybe", "not now", "already have"],
    negative: ["no", "not interested", "stop", "remove", "spam"],
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CATHY WORKER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const CATHY_CONFIG = {
  name: "CATHY",
  role: "Nurturer",
  description:
    "AI Nurture Worker - Handles objection handling and value touches",

  loop: {
    days: [10, 14, 21], // Day 7-21 nurture phase
    stage: "nurture",
    intent: "NURTURE",
  },

  handleClassifications: ["OBJECTION", "NEUTRAL", "NEGATIVE"],
  escalateTo: {
    POSITIVE: "SABRINA",
    BOOKING_REQUEST: "SABRINA",
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SABRINA WORKER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const SABRINA_CONFIG = {
  name: "SABRINA",
  role: "Closer",
  description: "AI Closer Worker - Handles booking requests and conversions",

  loop: {
    days: [28, 30], // Day 21+ closing phase
    stage: "close",
    intent: "QUALIFICATION",
  },

  handleClassifications: ["POSITIVE", "BOOKING_REQUEST"],

  // Booking link
  calendlyLink:
    process.env.CALENDLY_LINK || "https://calendly.com/tb-outreachglobal",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDLY CONFIGURATION - tb@outreachglobal.io
// ═══════════════════════════════════════════════════════════════════════════════

export const CALENDLY_CONFIG = {
  // Owner email
  ownerEmail: "tb@outreachglobal.io",

  // Base URL
  baseUrl: process.env.CALENDLY_BASE_URL || "https://calendly.com/tb-outreachglobal",

  // Meeting types with durations
  meetingTypes: {
    QUICK_CALL: {
      name: "15-Minute Quick Call",
      slug: "15min",
      duration: 15,
      url: process.env.CALENDLY_15MIN_URL || "https://calendly.com/tb-outreachglobal/15min",
      description: "Quick intro call - perfect for initial discovery",
    },
    STRATEGY_CALL: {
      name: "30-Minute Strategy Call",
      slug: "30min",
      duration: 30,
      url: process.env.CALENDLY_30MIN_URL || "https://calendly.com/tb-outreachglobal/30min",
      description: "In-depth strategy discussion",
    },
    DEEP_DIVE: {
      name: "60-Minute Deep Dive",
      slug: "60min",
      duration: 60,
      url: process.env.CALENDLY_60MIN_URL || "https://calendly.com/tb-outreachglobal/60min",
      description: "Full consultation and demo",
    },
  },

  // Default meeting for THE LOOP (15-min discovery)
  defaultMeeting: "QUICK_CALL",

  // Webhook endpoint
  webhookUrl: "/api/calendly/webhook",

  // Events we listen for
  events: [
    "invitee.created",
    "invitee.canceled",
    "invitee.rescheduled",
  ],
} as const;

export type CalendlyMeetingType = keyof typeof CALENDLY_CONFIG.meetingTypes;

// ═══════════════════════════════════════════════════════════════════════════════
// CORE EXECUTION FLOW
// ═══════════════════════════════════════════════════════════════════════════════
//
// THE FLOW:
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ 1. DATA IMPORT (USBizData CSV) ─────────────────────────────────────────────│
// │    ↓                                                                        │
// │ 2. BUILD TARGET AUDIENCE (Map to Industry List)                            │
// │    ↓                                                                        │
// │ 3. ENRICH CONTACTABILITY (Tracerfy - mobiles + emails @ $0.02/lead)        │
// │    ↓                                                                        │
// │ 4. CAMPAIGN PREP (ICP → Persona → Template)                                │
// │    ↓                                                                        │
// │ 5. DEPLOY SMS (GIANNA opener via SignalHouse)                              │
// │    ↓                                                                        │
// │ 6. AI COPILOT (Classify responses → Route HOT to call queue)               │
// │    ↓                                                                        │
// │ 7. MEETING BOOKED (Calendly webhook fires)                                 │
// │    ↓                                                                        │
// │ 8. PERPLEXITY RESEARCH (Deep personalization for the call)                 │
// │    ↓                                                                        │
// │ 9. 15-MIN DISCOVERY (High-impact, personalized conversation)               │
// └─────────────────────────────────────────────────────────────────────────────┘
//
