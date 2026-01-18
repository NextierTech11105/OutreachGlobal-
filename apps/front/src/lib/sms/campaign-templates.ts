/**
 * SMS CAMPAIGN TEMPLATE FRAMEWORK
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * GOAL: Book 15-minute discovery meetings
 *
 * CAMPAIGN CADENCE (30-Day Cycle):
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DAY 1:   INITIAL    (GIANNA)  - First contact                              │
 * │ DAY 3:   REMINDER   (GIANNA)  - Follow-up                                  │
 * │ DAY 7:   NUDGE      (CATHY)   - Final push with humor                      │
 * │ DAYS 8-30: PAUSE              - 30-day rest period                         │
 * │ DAY 31+: RETARGET   (SABRINA) - New number, push to calendar               │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * All templates: Under 160 characters for single SMS segment
 * Templates start EMPTY - build your own messaging stage by stage
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
  | "retarget"
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
  dayNumber: number; // For calendar view
}

export interface CadenceDay {
  day: number;
  stage: CampaignStage | "pause";
  worker: AIWorker | null;
  label: string;
  action: string;
  isPause: boolean;
}

// ============================================================================
// 10DLC CONFIGURATION
// ============================================================================

export const LANE_A_CONFIG: TenDLCConfig = {
  useCase: "LOW_VOLUME_MIXED",
  description: `One-to-one conversational outreach to business owners. Initial messages are permission-based questions. All messaging is advisory. Subsequent messages only sent after recipient response.`,
  sampleMessages: [
    "{{first_name}} - [YOUR INITIAL MESSAGE HERE]",
    "{{first_name}}, [YOUR REMINDER MESSAGE HERE]",
    "{{first_name}}, [YOUR NUDGE MESSAGE HERE]",
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
// CAMPAIGN STAGES (30-Day Cycle) - For Calendar View
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
    dayNumber: 1,
  },
  {
    stage: "reminder",
    worker: "GIANNA",
    label: "Reminder",
    description: "Follow-up if no response",
    color: "purple",
    triggerCondition: "No response after 2-3 days",
    goalAction: "Get response or confirmation",
    dayRange: "Day 3",
    dayNumber: 3,
  },
  {
    stage: "nudge",
    worker: "CATHY",
    label: "Nudge",
    description: "Final push with humor",
    color: "pink",
    triggerCondition: "Still no response",
    goalAction: "Last attempt before 30-day pause",
    dayRange: "Day 7",
    dayNumber: 7,
  },
  {
    stage: "retarget",
    worker: "SABRINA",
    label: "Retarget",
    description: "After 30-day pause - new number, push to calendar",
    color: "amber",
    triggerCondition: "30 days since last contact",
    goalAction: "Book 15-minute meeting",
    dayRange: "Day 31+",
    dayNumber: 31,
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
    dayNumber: 0,
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
    dayNumber: 0,
  },
];

// ============================================================================
// CADENCE CALENDAR (30-Day View)
// ============================================================================

export const CADENCE_CALENDAR: CadenceDay[] = [
  { day: 1, stage: "initial", worker: "GIANNA", label: "Initial", action: "Send initial message", isPause: false },
  { day: 2, stage: "pause", worker: null, label: "Wait", action: "Wait for response", isPause: true },
  { day: 3, stage: "reminder", worker: "GIANNA", label: "Reminder", action: "Send reminder", isPause: false },
  { day: 4, stage: "pause", worker: null, label: "Wait", action: "Wait for response", isPause: true },
  { day: 5, stage: "pause", worker: null, label: "Wait", action: "Wait for response", isPause: true },
  { day: 6, stage: "pause", worker: null, label: "Wait", action: "Wait for response", isPause: true },
  { day: 7, stage: "nudge", worker: "CATHY", label: "Nudge", action: "Send nudge with humor", isPause: false },
  // Days 8-30: Pause period
  ...Array.from({ length: 23 }, (_, i) => ({
    day: 8 + i,
    stage: "pause" as const,
    worker: null,
    label: "Pause",
    action: "30-day rest period",
    isPause: true,
  })),
  { day: 31, stage: "retarget", worker: "SABRINA", label: "Retarget", action: "New number, push to calendar", isPause: false },
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
  { key: "{{revenue_range}}", label: "Revenue Range", example: "$1-5M" },
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
// SMS TEMPLATE GROUPS - EMPTY (Build your own)
// Each group: INITIAL (GIANNA) → REMINDER (GIANNA) → NUDGE (CATHY)
// GOAL: Book 15-minute discovery meeting
// All messages under 160 characters
// ============================================================================

export const TEMPLATE_GROUPS: TemplateGroup[] = [];

// ============================================================================
// RETARGET TEMPLATES (Day 31+ - New Number, Push to Calendar)
// ============================================================================
// After 30 days pause, SABRINA comes in fresh from a NEW NUMBER
// and drives to calendar booking.
// ============================================================================

export const RETARGET_TEMPLATES: SMSTemplate[] = [];

// ============================================================================
// RETENTION TEMPLATES (Existing clients)
// ============================================================================

export const RETENTION_TEMPLATES: SMSTemplate[] = [];

// ============================================================================
// CONFIRMATION TEMPLATES (Appointments)
// ============================================================================

export const CONFIRMATION_TEMPLATES: SMSTemplate[] = [];

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
  ...RETARGET_TEMPLATES,
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

// ============================================================================
// CADENCE HELPERS (For Calendar View)
// ============================================================================

export function getCadenceForDay(day: number): CadenceDay | undefined {
  return CADENCE_CALENDAR.find((c) => c.day === day);
}

export function getActiveDays(): CadenceDay[] {
  return CADENCE_CALENDAR.filter((c) => !c.isPause);
}

export function getPauseDays(): CadenceDay[] {
  return CADENCE_CALENDAR.filter((c) => c.isPause);
}

export function getCadenceWeek(weekNumber: number): CadenceDay[] {
  const start = (weekNumber - 1) * 7 + 1;
  const end = start + 6;
  return CADENCE_CALENDAR.filter((c) => c.day >= start && c.day <= end);
}

export function formatCadenceForCalendar(): {
  weeks: CadenceDay[][];
  activeDays: number;
  pauseDays: number;
  totalDays: number;
} {
  const weeks: CadenceDay[][] = [];
  for (let i = 0; i < 5; i++) {
    weeks.push(getCadenceWeek(i + 1));
  }
  return {
    weeks,
    activeDays: getActiveDays().length,
    pauseDays: getPauseDays().length,
    totalDays: CADENCE_CALENDAR.length,
  };
}
