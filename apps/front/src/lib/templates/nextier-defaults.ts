/**
 * NEXTIER DEFAULT SMS TEMPLATE LIBRARY
 *
 * Pre-loaded templates for Nextier Technologies and sub-brands.
 * Other tenants get custom template libraries (charged service).
 *
 * VERTICALS:
 * - CRM Consultant Partnerships
 * - Business Brokering (Trades M&A)
 * - Real Estate Agents
 * - Alternative Lending
 * - White Label Solutions
 */

export type TemplateCategory =
  | "initial" // First contact - GIANNA
  | "retarget" // Re-engagement - CATHY
  | "nudge" // Friendly follow-up - CATHY
  | "closer" // Booking push - SABRINA
  | "breakup" // Final attempt before archive
  | "value-drop" // Content/case study share
  | "callback"; // Response to inbound

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
// GIANNA TEMPLATES (Opener)
// ============================================

const GIANNA_TEMPLATES: SmsTemplate[] = [
  // CRM CONSULTANT VERTICAL
  {
    id: "gianna-crm-intro-1",
    name: "CRM Consultant Opener",
    content:
      "Hi {firstName}, I came across {companyName} and noticed you're in the consulting space. We help consultants like you automate lead gen so you can focus on closing. Quick question - are you currently using any outreach automation?",
    category: "initial",
    worker: "gianna",
    vertical: "crm-consultant",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 289,
  },
  {
    id: "gianna-crm-value-1",
    name: "CRM Value Proposition",
    content:
      "Hey {firstName}! Just following up. We've helped consultants in {city} book 3-5 extra calls per week on autopilot. Would you be open to a quick 16-min chat to see if we can do the same for {companyName}?",
    category: "initial",
    worker: "gianna",
    vertical: "crm-consultant",
    variables: ["firstName", "city", "companyName"],
    complianceApproved: true,
    characterCount: 248,
  },

  // BUSINESS BROKER VERTICAL
  {
    id: "gianna-broker-intro-1",
    name: "Business Broker Opener",
    content:
      "Hi {firstName}, I'm reaching out to {companyName} owners who might be thinking about their exit strategy. Whether it's 2 years out or 10, we help trades businesses maximize their value. Is this something on your radar?",
    category: "initial",
    worker: "gianna",
    vertical: "business-broker",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 268,
  },
  {
    id: "gianna-broker-exit-1",
    name: "Exit Strategy Intro",
    content:
      "Hey {firstName}! Quick q - have you ever thought about what {companyName} would be worth if you decided to sell? Most {industry} owners leave 20-40% on the table. Happy to share what we're seeing in the market.",
    category: "initial",
    worker: "gianna",
    vertical: "business-broker",
    variables: ["firstName", "companyName", "industry"],
    complianceApproved: true,
    characterCount: 254,
  },

  // REAL ESTATE VERTICAL
  {
    id: "gianna-realestate-intro-1",
    name: "Real Estate Agent Opener",
    content:
      "Hi {firstName}! I noticed you're a top agent in {city}. We help agents like you generate 10-15 qualified seller leads per month without cold calling. Would you be open to a quick chat?",
    category: "initial",
    worker: "gianna",
    vertical: "real-estate",
    variables: ["firstName", "city"],
    complianceApproved: true,
    characterCount: 218,
  },
  {
    id: "gianna-realestate-tech-1",
    name: "Real Estate Tech Advantage",
    content:
      "Hey {firstName}, quick follow up. Our AI outreach system is helping agents in {state} close 2-3 more listings per quarter. The tech does the prospecting so you can focus on showings. Worth 16 min to explore?",
    category: "initial",
    worker: "gianna",
    vertical: "real-estate",
    variables: ["firstName", "state"],
    complianceApproved: true,
    characterCount: 241,
  },

  // ALTERNATIVE LENDING VERTICAL
  {
    id: "gianna-lending-intro-1",
    name: "Alt Lending Opener",
    content:
      "Hi {firstName}, I'm reaching out because {companyName} might qualify for alternative financing options that most business owners don't know about. Are you currently exploring any growth capital?",
    category: "initial",
    worker: "gianna",
    vertical: "alternative-lending",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 227,
  },

  // UNIVERSAL TEMPLATES
  {
    id: "gianna-universal-intro-1",
    name: "Generic Professional Opener",
    content:
      "Hi {firstName}, I came across {companyName} and wanted to reach out. We help {industry} businesses grow through automated outreach. Would you be open to a quick conversation?",
    category: "initial",
    worker: "gianna",
    vertical: "universal",
    variables: ["firstName", "companyName", "industry"],
    complianceApproved: true,
    characterCount: 208,
  },
];

// ============================================
// CATHY TEMPLATES (Nudger)
// ============================================

const CATHY_TEMPLATES: SmsTemplate[] = [
  // FRIENDLY NUDGES
  {
    id: "cathy-nudge-friendly-1",
    name: "Friendly Check-in",
    content:
      "Hey {firstName}! Just bumping this up in case it got buried. I know you're busy running {companyName}. Let me know if you'd like to chat - even a 10-min call could be valuable.",
    category: "nudge",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 214,
  },
  {
    id: "cathy-nudge-humor-1",
    name: "Light Humor Nudge",
    content:
      "Hey {firstName} - I promise I'm not a robot! 🤖 Just checking if you saw my last message. Would love to share how we're helping other {industry} businesses. Worth a quick call?",
    category: "nudge",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName", "industry"],
    complianceApproved: true,
    characterCount: 204,
  },
  {
    id: "cathy-nudge-curiosity-1",
    name: "Curiosity Hook",
    content:
      "Quick thought {firstName} - what if I told you we could add 5+ warm leads to your pipeline every week without you lifting a finger? That's what we did for a {industry} company last month.",
    category: "nudge",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName", "industry"],
    complianceApproved: true,
    characterCount: 222,
  },

  // RETARGET TEMPLATES
  {
    id: "cathy-retarget-1",
    name: "Circling Back",
    content:
      "Hi {firstName}, circling back one more time. I know timing is everything - if now isn't right, just let me know and I'll reach out in a few months. But if you're curious, I'm here!",
    category: "retarget",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 213,
  },
  {
    id: "cathy-retarget-casestudy-1",
    name: "Case Study Drop",
    content:
      "Hey {firstName}! Quick update - we just helped a {industry} company in {state} increase their booked calls by 47%. Thought of {companyName} immediately. Want me to share how?",
    category: "retarget",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName", "industry", "state", "companyName"],
    complianceApproved: true,
    characterCount: 211,
  },

  // VALUE DROPS
  {
    id: "cathy-value-roi-1",
    name: "ROI Value Drop",
    content:
      "{firstName} - fun fact: our clients see an average 340% ROI on their outreach investment in the first 90 days. Happy to show you the numbers if you're interested.",
    category: "value-drop",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 189,
  },
];

// ============================================
// SABRINA TEMPLATES (Closer/Booker)
// ============================================

const SABRINA_TEMPLATES: SmsTemplate[] = [
  // BOOKING TEMPLATES
  {
    id: "sabrina-book-direct-1",
    name: "Direct Booking Ask",
    content:
      "Hi {firstName}! I'd love to get you on a quick 16-min discovery call with Thomas, our founder. He personally helps {industry} businesses grow. Here's his calendar: {calendarLink}",
    category: "closer",
    worker: "sabrina",
    vertical: "universal",
    variables: ["firstName", "industry", "calendarLink"],
    complianceApproved: true,
    characterCount: 208,
  },
  {
    id: "sabrina-book-confirm-1",
    name: "Confirmation Request",
    content:
      "Hey {firstName}! I have you down for a call with Thomas this week. Just confirming you're all set. Looking forward to it - he's excited to learn more about {companyName}!",
    category: "closer",
    worker: "sabrina",
    vertical: "universal",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 198,
  },
  {
    id: "sabrina-objection-time-1",
    name: "Time Objection Handler",
    content:
      "Totally get it {firstName}, you're slammed. That's exactly why the call is only 16 min - Thomas respects your time. What if we did next week when things calm down? {calendarLink}",
    category: "closer",
    worker: "sabrina",
    vertical: "universal",
    variables: ["firstName", "calendarLink"],
    complianceApproved: true,
    characterCount: 213,
  },
  {
    id: "sabrina-objection-interest-1",
    name: "Interest Objection Handler",
    content:
      "No worries {firstName}! Just curious - is it the timing, or are you all set with your current lead gen? If it's working great, I'd love to know your secret 😄",
    category: "closer",
    worker: "sabrina",
    vertical: "universal",
    variables: ["firstName"],
    complianceApproved: true,
    characterCount: 186,
  },

  // CALLBACK RESPONSES
  {
    id: "sabrina-callback-positive-1",
    name: "Positive Response Handler",
    content:
      "That's great to hear {firstName}! Let me get you scheduled with Thomas for a 16-min discovery call. Here's his calendar - just pick a time that works: {calendarLink}",
    category: "callback",
    worker: "sabrina",
    vertical: "universal",
    variables: ["firstName", "calendarLink"],
    complianceApproved: true,
    characterCount: 195,
  },
];

// ============================================
// BREAKUP TEMPLATES
// ============================================

const BREAKUP_TEMPLATES: SmsTemplate[] = [
  {
    id: "breakup-graceful-1",
    name: "Graceful Exit",
    content:
      "Hey {firstName}, I don't want to be annoying so this will be my last message. If you ever want to explore how we help {industry} businesses grow, just reply 'YES' and I'll reach out. Take care!",
    category: "breakup",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName", "industry"],
    complianceApproved: true,
    characterCount: 224,
  },
  {
    id: "breakup-door-open-1",
    name: "Door Open Exit",
    content:
      "Last note {firstName} - I'll leave the door open. If {companyName} ever needs help with automated lead gen, we'll be here. Wishing you continued success!",
    category: "breakup",
    worker: "cathy",
    vertical: "universal",
    variables: ["firstName", "companyName"],
    complianceApproved: true,
    characterCount: 179,
  },
];

// ============================================
// SEQUENCE PRESETS
// ============================================

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

export const SEQUENCE_PRESETS: SequencePreset[] = [
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

export const COMPLIANCE_RULES = {
  minMessageSpacingHours: 24,
  maxMessagesBeforeEscalation: 3,
  businessHoursStart: 9, // 9 AM
  businessHoursEnd: 20, // 8 PM
  allowWeekends: false,
  maxCharacterCount: 320, // Standard SMS limit
  requiredOptOut: true,
  stopKeywords: ["STOP", "UNSUBSCRIBE", "CANCEL", "QUIT", "END"],
  positiveKeywords: [
    "yes",
    "interested",
    "tell me more",
    "sure",
    "ok",
    "sounds good",
  ],
  negativeKeywords: ["no", "not interested", "remove", "wrong number", "stop"],
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
// EXPORTS
// ============================================

export const ALL_TEMPLATES: SmsTemplate[] = [
  ...GIANNA_TEMPLATES,
  ...CATHY_TEMPLATES,
  ...SABRINA_TEMPLATES,
  ...BREAKUP_TEMPLATES,
];

export function getTemplatesByWorker(worker: WorkerType): SmsTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.worker === worker);
}

export function getTemplatesByVertical(
  vertical: VerticalType | "universal",
): SmsTemplate[] {
  return ALL_TEMPLATES.filter(
    (t) => t.vertical === vertical || t.vertical === "universal",
  );
}

export function getTemplatesByCategory(
  category: TemplateCategory,
): SmsTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.category === category);
}

export function getPresetsByVertical(
  vertical: VerticalType | "universal",
): SequencePreset[] {
  return SEQUENCE_PRESETS.filter(
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
