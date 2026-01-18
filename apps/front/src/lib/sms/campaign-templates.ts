/**
 * SMS CAMPAIGN TEMPLATE GROUPS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * GOAL: Book a 15-minute discovery meeting
 *
 * Campaign Flow (30-Day Cycle):
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ TOUCH 1: INITIAL (GIANNA)     - Day 1   - Open the conversation            │
 * │ TOUCH 2: REMINDER (GIANNA)    - Day 2-3 - Follow up, still friendly        │
 * │ TOUCH 3: NUDGE (CATHY)        - Day 5-7 - Humor, final push before pause   │
 * │ [30 DAYS PAUSE]               - Rest period                                │
 * │ PIVOT: New campaign/number OR follow-up (SABRINA)                          │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * All templates: Under 160 characters for single SMS segment
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ============================================================================
// TYPES
// ============================================================================

export type CampaignStage =
  | "initial"
  | "reminder"
  | "nudge"
  | "followup"
  | "retention"
  | "confirmation";

export type AIWorker =
  | "GIANNA"
  | "CATHY"
  | "SABRINA"
  | "NEVA"
  | "APPOINTMENT_BOT";

export type CampaignUseCase =
  | "LOW_VOLUME_MIXED"
  | "CONVERSATIONAL"
  | "MARKETING";

export type CampaignType = "conversational" | "marketing";

// ============================================================================
// INTERFACES
// ============================================================================

export interface TenDLCConfig {
  useCase: CampaignUseCase;
  description: string;
  sampleMessages: string[];
  messageFlow: string;
  helpResponse: string;
  optOutResponse: string;
  optInKeywords: string[];
  optOutKeywords: string[];
  helpKeywords: string[];
}

export interface SMSTemplate {
  id: string;
  name: string;
  message: string;
  stage: CampaignStage;
  worker: AIWorker;
  tags: string[];
  variables: string[];
  charCount: number;
}

export interface TemplateGroup {
  id: string;
  name: string;
  description: string;
  templates: {
    initial: SMSTemplate;
    reminder: SMSTemplate;
    nudge: SMSTemplate;
  };
}

export interface CampaignStageConfig {
  stage: CampaignStage;
  worker: AIWorker;
  label: string;
  description: string;
  color: string;
  triggerCondition: string;
  goalAction: string;
  dayRange: string;
}

// ============================================================================
// 10DLC CONFIGURATION
// ============================================================================

export const LANE_A_CONFIG: TenDLCConfig = {
  useCase: "LOW_VOLUME_MIXED",
  description: `One-to-one conversational outreach to business owners. Initial messages are permission-based questions. All messaging is advisory. Subsequent messages only sent after recipient response.`,
  sampleMessages: [
    "{{first_name}} - quick question: does the business run clean, or because you're everywhere?",
    "{{first_name}}, one question: how much time goes to doing work vs chasing it?",
    "Great to hear from you. I can share more via email - drop your best address.",
  ],
  messageFlow: `Consumers opt-in via business directories and forms. Initial message asks permission. Subsequent messages only after response. Reply HELP for assistance, STOP to opt out.`,
  helpResponse:
    "Advisory services for business owners. Reply STOP to opt out. Email support@nextier.io",
  optOutResponse: "Unsubscribed. Reply START to resubscribe.",
  optInKeywords: ["START", "SUBSCRIBE", "YES"],
  optOutKeywords: ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"],
  helpKeywords: ["HELP", "INFO"],
};

export const LANE_B_CONFIG: TenDLCConfig = {
  useCase: "CONVERSATIONAL",
  description: `Ongoing messaging with business owners who responded to initial outreach. Two-way dialogue focused on scheduling and gathering contact info.`,
  sampleMessages: [
    "Great to hear from you. Best email to send info?",
    "Appreciate the response. Call, email, or keep texting?",
    "Understood. If anything changes, text back.",
  ],
  messageFlow: `Handles leads who already responded. Two-way conversational dialogue. Reply HELP for assistance, STOP to opt out.`,
  helpResponse:
    "Advisory services for business owners. Reply STOP to opt out. Email support@nextier.io",
  optOutResponse: "Unsubscribed. Reply START to resubscribe.",
  optInKeywords: ["START", "YES", "CONTINUE"],
  optOutKeywords: ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"],
  helpKeywords: ["HELP", "INFO"],
};

// ============================================================================
// CAMPAIGN STAGES (30-Day Cycle)
// ============================================================================

export const CAMPAIGN_STAGES: CampaignStageConfig[] = [
  {
    stage: "initial",
    worker: "GIANNA",
    label: "Initial",
    description: "First contact message",
    color: "blue",
    triggerCondition: "New lead imported",
    goalAction: "Get ANY response",
    dayRange: "Day 1",
  },
  {
    stage: "reminder",
    worker: "GIANNA",
    label: "Reminder",
    description: "Follow-up if no response",
    color: "purple",
    triggerCondition: "No response after 2-3 days",
    goalAction: "Get response or confirmation",
    dayRange: "Day 2-3",
  },
  {
    stage: "nudge",
    worker: "CATHY",
    label: "Nudge",
    description: "Final push in current campaign",
    color: "pink",
    triggerCondition: "Still no response after 5-7 days",
    goalAction: "Last attempt before pause",
    dayRange: "Day 5-7",
  },
  {
    stage: "followup",
    worker: "SABRINA",
    label: "Follow-Up / Pivot",
    description: "After 30-day pause - new campaign or continue",
    color: "amber",
    triggerCondition: "30 days since last contact",
    goalAction: "Re-engage with fresh approach",
    dayRange: "Day 30+",
  },
  {
    stage: "retention",
    worker: "NEVA",
    label: "Retention",
    description: "Existing clients - referrals, reviews",
    color: "emerald",
    triggerCondition: "Post-meeting / client",
    goalAction: "Referrals, reviews, upsells",
    dayRange: "Ongoing",
  },
  {
    stage: "confirmation",
    worker: "APPOINTMENT_BOT",
    label: "Confirmation",
    description: "Appointment reminders",
    color: "cyan",
    triggerCondition: "Meeting scheduled",
    goalAction: "Reduce no-shows",
    dayRange: "Pre-meeting",
  },
];

// ============================================================================
// TEMPLATE VARIABLES
// ============================================================================

export const TEMPLATE_VARIABLES = [
  { key: "{{name}}", label: "Full Name", example: "John Smith" },
  { key: "{{first_name}}", label: "First Name", example: "John" },
  { key: "{{last_name}}", label: "Last Name", example: "Smith" },
  { key: "{{business_name}}", label: "Business Name", example: "Smith Auto" },
  { key: "{{sender_name}}", label: "Sender Name", example: "Gianna" },
  { key: "{{company}}", label: "Your Company", example: "Nextier" },
  { key: "{{city}}", label: "City", example: "Brooklyn" },
  { key: "{{state}}", label: "State", example: "NY" },
  { key: "{{industry}}", label: "Industry", example: "auto repair" },
  { key: "{{appointment_date}}", label: "Appointment Date", example: "Tuesday 2pm" },
  { key: "{{appointment_link}}", label: "Booking Link", example: "cal.com/nextier" },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function extractVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;
  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  return variables;
}

export function replaceVariables(
  template: string,
  values: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

export function countChars(message: string): number {
  return message.length;
}

export function isUnderLimit(message: string, limit: number = 160): boolean {
  return message.length <= limit;
}

// ============================================================================
// SMS TEMPLATE GROUPS
// Each group: INITIAL (GIANNA) → REMINDER (GIANNA) → NUDGE (CATHY)
// GOAL: Book 15-minute discovery meeting
// All messages under 160 characters
// ============================================================================

export const TEMPLATE_GROUPS: TemplateGroup[] = [
  // GROUP 1: Direct Business Question → 15 min call
  {
    id: "direct-business",
    name: "Business Operations",
    description: "Opens with operational question, drives to 15-min call",
    templates: {
      initial: {
        id: "direct-1-initial",
        name: "GIANNA Touch 1",
        message: "{{first_name}} - does your business run smooth, or only because you're always there? 15 mins and I'll show you why that matters.",
        stage: "initial",
        worker: "GIANNA",
        tags: ["direct", "operations", "15min"],
        variables: ["first_name"],
        charCount: 138,
      },
      reminder: {
        id: "direct-1-reminder",
        name: "GIANNA Touch 2",
        message: "{{first_name}}, circling back. Got 15 mins this week? I'll show you what most owners miss.",
        stage: "reminder",
        worker: "GIANNA",
        tags: ["reminder", "15min"],
        variables: ["first_name"],
        charCount: 97,
      },
      nudge: {
        id: "direct-1-nudge",
        name: "CATHY Touch 3",
        message: "{{first_name}}, I promise I'm more interesting than my texts. 15 mins - that's all I'm asking. Yes or no?",
        stage: "nudge",
        worker: "CATHY",
        tags: ["nudge", "humor", "15min"],
        variables: ["first_name"],
        charCount: 109,
      },
    },
  },

  // GROUP 2: Time Audit → 15 min call
  {
    id: "time-audit",
    name: "Time Reclaim",
    description: "Focus on time wasted, offers 15-min solution",
    templates: {
      initial: {
        id: "time-2-initial",
        name: "GIANNA Touch 1",
        message: "{{first_name}}, how much of your week is doing work vs chasing it? 15 mins and I'll show you how to flip that.",
        stage: "initial",
        worker: "GIANNA",
        tags: ["time", "15min"],
        variables: ["first_name"],
        charCount: 121,
      },
      reminder: {
        id: "time-2-reminder",
        name: "GIANNA Touch 2",
        message: "{{first_name}} - quick 15 mins could save you hours. When works this week?",
        stage: "reminder",
        worker: "GIANNA",
        tags: ["reminder", "15min"],
        variables: ["first_name"],
        charCount: 75,
      },
      nudge: {
        id: "time-2-nudge",
        name: "CATHY Touch 3",
        message: "{{first_name}}, I've texted you more than I text my mom. She's jealous. Give me 15 mins? 😅",
        stage: "nudge",
        worker: "CATHY",
        tags: ["nudge", "humor", "15min"],
        variables: ["first_name"],
        charCount: 99,
      },
    },
  },

  // GROUP 3: Valuation → 15 min call
  {
    id: "valuation",
    name: "Business Value",
    description: "Valuation hook leads to 15-min assessment call",
    templates: {
      initial: {
        id: "val-3-initial",
        name: "GIANNA Touch 1",
        message: "{{first_name}}, ever wonder what {{business_name}} could sell for? 15 mins and I'll give you the real number.",
        stage: "initial",
        worker: "GIANNA",
        tags: ["valuation", "15min"],
        variables: ["first_name", "business_name"],
        charCount: 116,
      },
      reminder: {
        id: "val-3-reminder",
        name: "GIANNA Touch 2",
        message: "{{first_name}}, free valuation still on the table. 15 mins - you'll know exactly where you stand.",
        stage: "reminder",
        worker: "GIANNA",
        tags: ["reminder", "15min"],
        variables: ["first_name"],
        charCount: 103,
      },
      nudge: {
        id: "val-3-nudge",
        name: "CATHY Touch 3",
        message: "{{first_name}} - last shot at the free valuation. 15 mins, no strings. Yes or should I move on?",
        stage: "nudge",
        worker: "CATHY",
        tags: ["nudge", "15min"],
        variables: ["first_name"],
        charCount: 100,
      },
    },
  },

  // GROUP 4: System Builder → 15 min call
  {
    id: "system-builder",
    name: "Systems & Automation",
    description: "Irony angle - who builds YOUR systems? → 15 min call",
    templates: {
      initial: {
        id: "sys-4-initial",
        name: "GIANNA Touch 1",
        message: "{{first_name}}, you help clients build systems. But who's building yours? 15 mins and I'll show you.",
        stage: "initial",
        worker: "GIANNA",
        tags: ["system", "irony", "15min"],
        variables: ["first_name"],
        charCount: 110,
      },
      reminder: {
        id: "sys-4-reminder",
        name: "GIANNA Touch 2",
        message: "{{first_name}}, 15 mins to see what we build for people like you. Worth a look?",
        stage: "reminder",
        worker: "GIANNA",
        tags: ["reminder", "15min"],
        variables: ["first_name"],
        charCount: 84,
      },
      nudge: {
        id: "sys-4-nudge",
        name: "CATHY Touch 3",
        message: "{{first_name}}, I'll make you a deal - 15 mins or I stop texting. Win-win either way 😉",
        stage: "nudge",
        worker: "CATHY",
        tags: ["nudge", "humor", "15min"],
        variables: ["first_name"],
        charCount: 96,
      },
    },
  },

  // GROUP 5: Pipeline → 15 min call
  {
    id: "pipeline",
    name: "Pipeline & Deal Flow",
    description: "Feast or famine problem → 15 min solution call",
    templates: {
      initial: {
        id: "pipe-5-initial",
        name: "GIANNA Touch 1",
        message: "{{first_name}}, tired of feast or famine in {{industry}}? 15 mins and I'll show you steady deal flow.",
        stage: "initial",
        worker: "GIANNA",
        tags: ["pipeline", "15min"],
        variables: ["first_name", "industry"],
        charCount: 111,
      },
      reminder: {
        id: "pipe-5-reminder",
        name: "GIANNA Touch 2",
        message: "{{first_name}}, still want to fix the pipeline? 15 mins - let's map it out together.",
        stage: "reminder",
        worker: "GIANNA",
        tags: ["reminder", "15min"],
        variables: ["first_name"],
        charCount: 93,
      },
      nudge: {
        id: "pipe-5-nudge",
        name: "CATHY Touch 3",
        message: "{{first_name}}, my pipeline is YOU right now 😂 Give me 15 mins - I promise I'll make it worth it.",
        stage: "nudge",
        worker: "CATHY",
        tags: ["nudge", "humor", "15min"],
        variables: ["first_name"],
        charCount: 107,
      },
    },
  },

  // GROUP 6: Simple Value Prop → 15 min call
  {
    id: "simple-value",
    name: "Simple Value",
    description: "Straightforward value prop → 15 min call",
    templates: {
      initial: {
        id: "simple-6-initial",
        name: "GIANNA Touch 1",
        message: "{{first_name}}, I help business owners get more done with less hustle. 15 mins to show you how.",
        stage: "initial",
        worker: "GIANNA",
        tags: ["value", "15min"],
        variables: ["first_name"],
        charCount: 105,
      },
      reminder: {
        id: "simple-6-reminder",
        name: "GIANNA Touch 2",
        message: "{{first_name}}, following up. 15 mins this week? I'll make it count.",
        stage: "reminder",
        worker: "GIANNA",
        tags: ["reminder", "15min"],
        variables: ["first_name"],
        charCount: 68,
      },
      nudge: {
        id: "simple-6-nudge",
        name: "CATHY Touch 3",
        message: "{{first_name}}, yes or no - 15 mins or I'll leave you alone. No hard feelings either way!",
        stage: "nudge",
        worker: "CATHY",
        tags: ["nudge", "15min"],
        variables: ["first_name"],
        charCount: 95,
      },
    },
  },
];

// ============================================================================
// SABRINA PIVOT TEMPLATES (Day 30+ - New Number, Push to Calendar)
// ============================================================================
// After 30 days of entertaining + valuable content, SABRINA comes in fresh
// from a NEW NUMBER and drives to calendar booking.
// ============================================================================

export const FOLLOWUP_TEMPLATES: SMSTemplate[] = [
  {
    id: "sabrina-pivot-1",
    name: "SABRINA - Fresh Intro",
    message: "{{first_name}}, Sabrina here from Nextier. Gianna's been texting you - thought I'd reach out directly. Got 15 mins for a call?",
    stage: "followup",
    worker: "SABRINA",
    tags: ["pivot", "calendar", "intro"],
    variables: ["first_name"],
    charCount: 133,
  },
  {
    id: "sabrina-pivot-2",
    name: "SABRINA - Calendar Push",
    message: "{{first_name}}, let's get you on the calendar. 15 mins this week - I'll show you exactly what we do. When works?",
    stage: "followup",
    worker: "SABRINA",
    tags: ["pivot", "calendar"],
    variables: ["first_name"],
    charCount: 117,
  },
  {
    id: "sabrina-pivot-3",
    name: "SABRINA - Demo Offer",
    message: "{{first_name}}, you've seen our outreach in action. Now let me show you behind the curtain. 15 mins - worth it?",
    stage: "followup",
    worker: "SABRINA",
    tags: ["pivot", "demo", "meta"],
    variables: ["first_name"],
    charCount: 114,
  },
  {
    id: "sabrina-pivot-4",
    name: "SABRINA - Value Stack",
    message: "{{first_name}}, what you've been getting is just 10% of what we build. Let's hop on - I'll show you the full system.",
    stage: "followup",
    worker: "SABRINA",
    tags: ["pivot", "value", "calendar"],
    variables: ["first_name"],
    charCount: 122,
  },
  {
    id: "sabrina-pivot-5",
    name: "SABRINA - Direct Book",
    message: "{{first_name}}, Sabrina here. Let's get this on the calendar: {{appointment_link}} - pick a time that works for you.",
    stage: "followup",
    worker: "SABRINA",
    tags: ["pivot", "direct-book"],
    variables: ["first_name", "appointment_link"],
    charCount: 120,
  },
  {
    id: "sabrina-pivot-6",
    name: "SABRINA - Last Push",
    message: "{{first_name}}, last reach out from me. 15 mins or I'll move on - no hard feelings. Here's my calendar: {{appointment_link}}",
    stage: "followup",
    worker: "SABRINA",
    tags: ["pivot", "final", "calendar"],
    variables: ["first_name", "appointment_link"],
    charCount: 131,
  },
];

// ============================================================================
// RETENTION TEMPLATES (Existing clients)
// ============================================================================

export const RETENTION_TEMPLATES: SMSTemplate[] = [
  {
    id: "retain-1",
    name: "Check-In",
    message: "{{first_name}}, {{sender_name}} checking in. How's everything going since we connected?",
    stage: "retention",
    worker: "NEVA",
    tags: ["retention", "check-in"],
    variables: ["first_name", "sender_name"],
    charCount: 86,
  },
  {
    id: "retain-2",
    name: "Referral Ask",
    message: "{{first_name}}, know anyone else who could use what we did for you? Happy to help them.",
    stage: "retention",
    worker: "NEVA",
    tags: ["retention", "referral"],
    variables: ["first_name"],
    charCount: 91,
  },
  {
    id: "retain-3",
    name: "Results Check",
    message: "{{first_name}}, how are the results looking? Would love an update.",
    stage: "retention",
    worker: "NEVA",
    tags: ["retention", "results"],
    variables: ["first_name"],
    charCount: 65,
  },
];

// ============================================================================
// CONFIRMATION TEMPLATES (Appointments)
// ============================================================================

export const CONFIRMATION_TEMPLATES: SMSTemplate[] = [
  {
    id: "confirm-1",
    name: "Day Before",
    message: "{{first_name}}, reminder about our call tomorrow at {{appointment_date}}. See you then!",
    stage: "confirmation",
    worker: "APPOINTMENT_BOT",
    tags: ["confirmation", "24h"],
    variables: ["first_name", "appointment_date"],
    charCount: 87,
  },
  {
    id: "confirm-2",
    name: "1 Hour",
    message: "{{first_name}}, we're on in 1 hour. Reply YES to confirm or let me know to reschedule.",
    stage: "confirmation",
    worker: "APPOINTMENT_BOT",
    tags: ["confirmation", "1h"],
    variables: ["first_name"],
    charCount: 89,
  },
  {
    id: "confirm-3",
    name: "15 Min",
    message: "{{first_name}}, starting in 15 mins! Link: {{appointment_link}}",
    stage: "confirmation",
    worker: "APPOINTMENT_BOT",
    tags: ["confirmation", "15min"],
    variables: ["first_name", "appointment_link"],
    charCount: 60,
  },
  {
    id: "confirm-4",
    name: "No Show",
    message: "{{first_name}}, we missed each other. Want to reschedule? Just reply with a time.",
    stage: "confirmation",
    worker: "APPOINTMENT_BOT",
    tags: ["confirmation", "no-show"],
    variables: ["first_name"],
    charCount: 84,
  },
];

// ============================================================================
// COMBINED EXPORTS
// ============================================================================

// Get all templates from groups
export function getAllInitialTemplates(): SMSTemplate[] {
  return TEMPLATE_GROUPS.map((g) => g.templates.initial);
}

export function getAllReminderTemplates(): SMSTemplate[] {
  return TEMPLATE_GROUPS.map((g) => g.templates.reminder);
}

export function getAllNudgeTemplates(): SMSTemplate[] {
  return TEMPLATE_GROUPS.map((g) => g.templates.nudge);
}

// All templates flat array
export const ALL_SMS_TEMPLATES: SMSTemplate[] = [
  ...getAllInitialTemplates(),
  ...getAllReminderTemplates(),
  ...getAllNudgeTemplates(),
  ...FOLLOWUP_TEMPLATES,
  ...RETENTION_TEMPLATES,
  ...CONFIRMATION_TEMPLATES,
];

// Get templates by stage
export function getTemplatesByStage(stage: CampaignStage): SMSTemplate[] {
  return ALL_SMS_TEMPLATES.filter((t) => t.stage === stage);
}

// Get templates by AI worker
export function getTemplatesByWorker(worker: AIWorker): SMSTemplate[] {
  return ALL_SMS_TEMPLATES.filter((t) => t.worker === worker);
}

// Get templates by tag
export function getTemplatesByTag(tag: string): SMSTemplate[] {
  return ALL_SMS_TEMPLATES.filter((t) => t.tags.includes(tag));
}

// Search templates
export function searchTemplates(query: string): SMSTemplate[] {
  const q = query.toLowerCase();
  return ALL_SMS_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.message.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

// Get stage config
export function getStageConfig(
  stage: CampaignStage
): CampaignStageConfig | undefined {
  return CAMPAIGN_STAGES.find((s) => s.stage === stage);
}

// Get template group by ID
export function getTemplateGroup(id: string): TemplateGroup | undefined {
  return TEMPLATE_GROUPS.find((g) => g.id === id);
}

// Format template for SignalHouse API
export function formatForSignalHouse(template: SMSTemplate): {
  name: string;
  content: string;
  variables: string[];
} {
  return {
    name: `${template.stage}-${template.id}`,
    content: template.message,
    variables: template.variables,
  };
}
