// ==========================================
// AI COPILOT GIANNA - INBOUND RESPONSE HANDLING
// Per-client SMS response classification logic
// ==========================================

// ==========================================
// CAMPAIGN CONTEXT TYPES
// Each SMS campaign has context for workflow state
// ==========================================
export type CampaignContext =
  | "initial" // First touch outreach
  | "retarget" // Re-engagement of non-responders
  | "follow_up" // Following up on interest
  | "book_appointment" // Appointment booking workflow
  | "nurture" // Long-term nurture sequence
  | "instant" // Instant/immediate response
  | "nudger"; // Gentle reminder for non-responders

export interface CampaignContextConfig {
  id: CampaignContext;
  name: string;
  description: string;
  nextSteps: CampaignContext[];
}

export const CAMPAIGN_CONTEXTS: CampaignContextConfig[] = [
  {
    id: "initial",
    name: "Initial Outreach",
    description: "First touch SMS to new leads",
    nextSteps: ["follow_up", "retarget"],
  },
  {
    id: "retarget",
    name: "Retarget",
    description: "Re-engagement of non-responders",
    nextSteps: ["follow_up", "nurture"],
  },
  {
    id: "follow_up",
    name: "Follow Up",
    description: "Following up on expressed interest",
    nextSteps: ["book_appointment", "nurture"],
  },
  {
    id: "book_appointment",
    name: "Book Appointment",
    description: "Appointment booking workflow",
    nextSteps: ["nurture"],
  },
  {
    id: "nurture",
    name: "Nurture",
    description: "Long-term nurture sequence",
    nextSteps: ["retarget", "book_appointment"],
  },
  {
    id: "instant",
    name: "Instant Response",
    description: "Immediate/real-time response",
    nextSteps: ["follow_up", "book_appointment"],
  },
  {
    id: "nudger",
    name: "Nudger",
    description: "Gentle reminder for non-responders - deployed through CATHY",
    nextSteps: ["follow_up", "retarget", "book_appointment"],
  },
];

export interface ResponseClassification {
  id: string;
  name: string;
  description: string;
  detect: (message: string) => boolean;
  extract?: (message: string) => Record<string, string | null>;
  priority: number; // Higher = check first
  deliverable?: string; // What content to deliver (property-valuation, exit-prep, white-label-pitch, etc.)
  queue?: string; // Which delivery queue (valuation-queue, content-queue, etc.)
  suppress?: boolean; // If true, hide from AI Inbound Response Center UI
  highlight?: "green" | "yellow" | "red" | "blue"; // Tag color for UI
}

// ==========================================
// DELIVERABLE TYPES
// Content delivered based on email capture
// ==========================================
export type DeliverableType =
  | "property-valuation-report" // Homeowner Advisor
  | "exit-preparation" // ECBB deal sourcing targets
  | "white-label-pitch" // OutreachGlobal prospects (consultants/agencies)
  | "user-to-owner-pitch" // Nextier RE broker prospects
  | "buyer-profile" // ECBB deal origination (PE/REITs)
  | "custom";

export interface DeliverableConfig {
  type: DeliverableType;
  name: string;
  description: string;
  queue: string;
  clientIds: string[];
}

export const DELIVERABLES: DeliverableConfig[] = [
  {
    type: "property-valuation-report",
    name: "Property Valuation Report",
    description: "Home valuation report for property owners",
    queue: "valuation-queue",
    clientIds: ["homeowner-advisor"],
  },
  {
    type: "exit-preparation",
    name: "Exit Preparation Content",
    description: "Business exit planning content for deal sourcing targets",
    queue: "content-queue",
    clientIds: ["ecbb-deal-sourcing"],
  },
  {
    type: "white-label-pitch",
    name: "White Label Pitch",
    description: "OutreachGlobal white-label platform pitch for agencies",
    queue: "sales-queue",
    clientIds: ["outreachglobal-white-label"],
  },
  {
    type: "user-to-owner-pitch",
    name: "User-to-Owner Pitch",
    description: "Nextier platform pitch for RE brokers to white-label",
    queue: "sales-queue",
    clientIds: ["nextier-re-datalake"],
  },
  {
    type: "buyer-profile",
    name: "Buyer Profile",
    description: "Investment criteria for PE/REIT deal origination",
    queue: "origination-queue",
    clientIds: ["ecbb-deal-origination"],
  },
];

export interface ClientClassifications {
  clientId: string;
  clientName: string;
  businessLine: string;
  classifications: ResponseClassification[];
}

// ==========================================
// DETECTION HELPERS
// ==========================================

// Email regex - captures email addresses
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

// Phone regex - captures phone numbers
const PHONE_REGEX =
  /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;

// Opt-out keywords
const OPT_OUT_KEYWORDS = [
  "STOP",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
  "OPTOUT",
  "OPT OUT",
  "REMOVE",
];

// Interest keywords
const INTEREST_KEYWORDS = [
  "YES",
  "INTERESTED",
  "CALL",
  "INFO",
  "MORE",
  "DETAILS",
  "HELP",
  "TELL ME",
];

// Negative keywords
const NEGATIVE_KEYWORDS = [
  "NO",
  "NOT INTERESTED",
  "NO THANKS",
  "PASS",
  "DECLINE",
  "WRONG NUMBER",
];

// Profanity keywords (suppress from UI)
const PROFANITY_KEYWORDS = [
  "FUCK",
  "SHIT",
  "ASS",
  "BITCH",
  "DAMN",
  "HELL",
  "CRAP",
  "DICK",
  "PISS",
  "BASTARD",
];

// ==========================================
// HOMEOWNER ADVISOR CLASSIFICATIONS
// Business Line: Nextier (WHITE-LABEL CLIENT #1)
// Focus: Residential Distressed Real Estate
// Goal: Capture emails for PROPERTY VALUATION reports
// Director: Cole (manages this client)
// ==========================================

const HOMEOWNER_ADVISOR_CLASSIFICATIONS: ResponseClassification[] = [
  // SUPPRESSED - Profanity (hide from UI)
  {
    id: "profanity",
    name: "Profanity",
    description: "Message contains profanity - suppressed from UI",
    priority: 200, // Check first
    suppress: true,
    detect: (message: string) => {
      const upper = message.toUpperCase();
      return PROFANITY_KEYWORDS.some((kw) => upper.includes(kw));
    },
  },
  // SUPPRESSED - Opt-out (hide from UI)
  {
    id: "opt-out",
    name: "Opt-Out",
    description: "Contact requested to be removed from SMS list",
    priority: 190,
    suppress: true, // Hide from AI Inbound Response Center
    detect: (message: string) => {
      const upper = message.toUpperCase().trim();
      return OPT_OUT_KEYWORDS.some((kw) => upper.includes(kw));
    },
  },
  // SUPPRESSED - Wrong Number (hide from UI)
  {
    id: "wrong-number",
    name: "Wrong Number",
    description: "Contact indicates wrong number - remove from list",
    priority: 185,
    suppress: true, // Hide from AI Inbound Response Center
    detect: (message: string) => {
      const upper = message.toUpperCase().trim();
      return (
        upper.includes("WRONG NUMBER") ||
        upper.includes("WRONG PERSON") ||
        upper.includes("NOT ME") ||
        upper.includes("WHO IS THIS") ||
        upper.includes("DON'T KNOW") ||
        upper.includes("DONT KNOW") ||
        upper.includes("NEVER HEARD") ||
        upper.includes("DON'T TEXT") ||
        upper.includes("DONT TEXT")
      );
    },
  },
  // SUPPRESSED - Not Interested (hide from UI - focus on leads that matter)
  {
    id: "not-interested",
    name: "Not Interested",
    description: "Contact declined or not interested",
    priority: 180,
    suppress: true, // Hide - we focus on actionable leads only
    detect: (message: string) => {
      const upper = message.toUpperCase().trim();
      return NEGATIVE_KEYWORDS.some((kw) => upper.includes(kw));
    },
  },
  // GREEN TAG - Email Capture (highest priority actionable)
  {
    id: "email-capture",
    name: "Email Capture",
    description:
      "Response contains email address for PROPERTY VALUATION report delivery",
    priority: 100,
    highlight: "green",
    detect: (message: string) => {
      const emails = message.match(EMAIL_REGEX);
      return emails !== null && emails.length > 0;
    },
    extract: (message: string) => {
      const emails = message.match(EMAIL_REGEX);
      return {
        email: emails?.[0] || null,
        allEmails: emails?.join(", ") || null,
        deliverable: "property-valuation-report",
      };
    },
  },
  // GREEN TAG - Called Phone Line (high intent)
  {
    id: "called-phone-line",
    name: "Called Phone Line",
    description: "Contact called back after SMS - HIGH INTENT inbound call",
    priority: 95,
    highlight: "green",
    detect: (message: string) => {
      const upper = message.toUpperCase().trim();
      return (
        upper.includes("INBOUND CALL") ||
        upper.includes("CALLED BACK") ||
        upper.includes("CALL FROM") ||
        message.startsWith("[CALL]") ||
        message.startsWith("[INBOUND]")
      );
    },
  },
  // GREEN TAG - Question (needs assistance)
  {
    id: "question",
    name: "Question",
    description: "Contact asked a question - needs follow-up",
    priority: 85,
    highlight: "green",
    detect: (message: string) => {
      return message.includes("?");
    },
  },
  // GREEN TAG - Help/Assistance Request
  {
    id: "assistance",
    name: "Assistance Request",
    description: "Contact requested help or assistance",
    priority: 80,
    highlight: "green",
    detect: (message: string) => {
      const upper = message.toUpperCase().trim();
      return (
        upper.includes("HELP") ||
        upper.includes("ASSIST") ||
        upper.includes("SUPPORT") ||
        upper.includes("CAN YOU") ||
        upper.includes("COULD YOU") ||
        upper.includes("PLEASE")
      );
    },
  },
  // GREEN TAG - Interested
  {
    id: "interested",
    name: "Interested",
    description: "Contact expressed interest in valuation report",
    priority: 50,
    highlight: "green",
    detect: (message: string) => {
      const upper = message.toUpperCase().trim();
      return INTEREST_KEYWORDS.some((kw) => upper.includes(kw));
    },
  },
  // BLUE TAG - Thank You (acknowledgment)
  {
    id: "thank-you",
    name: "Thank You",
    description: "Contact acknowledged receipt (likely after email provided)",
    priority: 30,
    highlight: "blue",
    detect: (message: string) => {
      const upper = message.toUpperCase().trim();
      return (
        upper.includes("THANK") ||
        upper.includes("THANKS") ||
        upper.includes("TY")
      );
    },
  },
  // No highlight - Other
  {
    id: "other",
    name: "Other Response",
    description: "Unclassified response - needs manual review",
    priority: 0,
    detect: () => true, // Catch-all
  },
];

// ==========================================
// CLIENT CLASSIFICATION REGISTRY
// ==========================================

export const CLIENT_CLASSIFICATIONS: ClientClassifications[] = [
  {
    clientId: "homeowner-advisor",
    clientName: "Homeowner Advisor",
    businessLine: "nextier",
    classifications: HOMEOWNER_ADVISOR_CLASSIFICATIONS,
  },
  // Add more clients here as needed:
  // {
  //   clientId: "nextier-direct",
  //   clientName: "Nextier Direct",
  //   businessLine: "nextier",
  //   classifications: [...],
  // },
  // {
  //   clientId: "ecbb",
  //   clientName: "East Coast Business Brokers",
  //   businessLine: "ecbb",
  //   classifications: [...],
  // },
];

// ==========================================
// CLASSIFICATION ENGINE
// ==========================================

export interface ClassificationResult {
  clientId: string;
  classificationId: string;
  classificationName: string;
  extracted: Record<string, string | null>;
  message: string;
  timestamp: string;
}

/**
 * Classify an SMS response for a specific client
 */
export function classifyResponse(
  clientId: string,
  message: string,
): ClassificationResult | null {
  const client = CLIENT_CLASSIFICATIONS.find((c) => c.clientId === clientId);
  if (!client) {
    console.warn(`[Classification] Unknown client: ${clientId}`);
    return null;
  }

  // Sort by priority (highest first)
  const sorted = [...client.classifications].sort(
    (a, b) => b.priority - a.priority,
  );

  for (const classification of sorted) {
    if (classification.detect(message)) {
      const extracted = classification.extract?.(message) || {};
      return {
        clientId,
        classificationId: classification.id,
        classificationName: classification.name,
        extracted,
        message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  return null;
}

/**
 * Get all classifications for a client
 */
export function getClientClassifications(
  clientId: string,
): ResponseClassification[] {
  const client = CLIENT_CLASSIFICATIONS.find((c) => c.clientId === clientId);
  return client?.classifications || [];
}

/**
 * Check if message is an email capture
 */
export function isEmailCapture(message: string): boolean {
  const emails = message.match(EMAIL_REGEX);
  return emails !== null && emails.length > 0;
}

/**
 * Extract email from message
 */
export function extractEmail(message: string): string | null {
  const emails = message.match(EMAIL_REGEX);
  return emails?.[0] || null;
}

/**
 * Check if message is an opt-out
 */
export function isOptOut(message: string): boolean {
  const upper = message.toUpperCase().trim();
  return OPT_OUT_KEYWORDS.some((kw) => upper.includes(kw));
}

/**
 * Check if message shows interest
 */
export function isInterested(message: string): boolean {
  const upper = message.toUpperCase().trim();
  return INTEREST_KEYWORDS.some((kw) => upper.includes(kw));
}

// ==========================================
// SUPPRESSION HELPERS
// ==========================================

/**
 * Check if response should be suppressed from UI
 * (STOP, profanity, etc. - GIANNA doesn't focus on these)
 */
export function shouldSuppressResponse(
  clientId: string,
  message: string,
): boolean {
  const result = classifyResponse(clientId, message);
  if (!result) return false;

  const client = CLIENT_CLASSIFICATIONS.find((c) => c.clientId === clientId);
  const classification = client?.classifications.find(
    (c) => c.id === result.classificationId,
  );

  return classification?.suppress === true;
}

/**
 * Check if response contains profanity
 */
export function containsProfanity(message: string): boolean {
  const upper = message.toUpperCase();
  return PROFANITY_KEYWORDS.some((kw) => upper.includes(kw));
}

// ==========================================
// GIANNA AI RESPONSE TEMPLATES
// Structured templates for AI copilot responses
// ==========================================

export type GiannaTemplateType = "email_capture" | "question" | "assistance" | "nudger";

export interface GiannaResponseTemplate {
  id: GiannaTemplateType;
  name: string;
  description: string;
  classificationIds: string[]; // Which classifications trigger this template
  template: string;
  variables: string[]; // Placeholders to fill
  automatable: boolean; // Can be fully automated or needs human-in-loop
}

export const GIANNA_RESPONSE_TEMPLATES: GiannaResponseTemplate[] = [
  {
    id: "email_capture",
    name: "Email Capture Acknowledgment",
    description: "Respond when lead provides their email address",
    classificationIds: ["email-capture"],
    template: `Ok great {{first_name}}! I will have the {{value_content}} emailed to you by this week. Have a great day! - Gianna`,
    variables: ["first_name", "value_content"],
    automatable: true, // Can be fully automated
  },
  {
    id: "question",
    name: "Question Response",
    description: "Respond when lead asks a question",
    classificationIds: ["question"],
    template: `Great question, {{first_name}}! {{ai_generated_answer}} Would you like me to send more details to your email?`,
    variables: ["first_name", "ai_generated_answer"],
    automatable: false, // Human-in-loop for AI answer review
  },
  {
    id: "assistance",
    name: "Assistance Response",
    description: "Respond when lead requests help or assistance",
    classificationIds: ["assistance", "interested", "called-phone-line"],
    template: `Hi {{first_name}}, I'd be happy to help! {{context_response}} What's the best email to send you more information?`,
    variables: ["first_name", "context_response"],
    automatable: false, // Human-in-loop for context
  },
  {
    id: "nudger",
    name: "CATHY Nudger",
    description: "Background nudge for non-responders - deployed through CATHY",
    classificationIds: [], // Outbound only, not triggered by inbound classification
    template: `Hey {{first_name}}, we tried reaching you {{attempt_count}} times... do we have the right person?? Let us know! - Cathy`,
    variables: ["first_name", "attempt_count"],
    automatable: true, // CATHY runs in background automatically
  },
];

// ==========================================
// CATHY NUDGER SYSTEM
// Background nudge tracking for non-responders
// ==========================================

export interface NudgeAttempt {
  nudgeId: string; // Unique ID for this nudge: nudge_${timestamp}_${random}
  leadId: string;
  attemptNumber: number; // 1, 2, 3, 4...
  sentAt: string; // ISO timestamp
  messageId?: string; // SignalHouse message ID
  status: "sent" | "delivered" | "failed" | "responded";
  template: string; // Which template was used
}

export interface LeadNudgeHistory {
  leadId: string;
  firstName: string;
  phone: string;
  campaignContext: CampaignContext; // What type of campaign
  attempts: NudgeAttempt[];
  totalAttempts: number;
  lastAttemptAt: string | null;
  lastAttemptHour: number | null; // 0-23 hour of last attempt
  lastResponseAt: string | null;
  suggestedNextTime: string | null; // Smart scheduling suggestion
  status: "active" | "responded" | "exhausted" | "opted_out";
}

/**
 * Time slots for smart scheduling
 */
export type TimeSlot = "morning" | "midday" | "afternoon" | "evening";

/**
 * Get time slot from hour
 */
export function getTimeSlot(hour: number): TimeSlot {
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "midday";
  if (hour >= 14 && hour < 18) return "afternoon";
  return "evening";
}

/**
 * Get opposite time slot for smart scheduling
 * If morning attempts fail, try evening. If midday fails, try morning/evening.
 */
export function getOppositeTimeSlot(slot: TimeSlot): TimeSlot {
  const opposites: Record<TimeSlot, TimeSlot> = {
    morning: "evening",
    midday: "morning",
    afternoon: "morning",
    evening: "midday",
  };
  return opposites[slot];
}

/**
 * Suggest next outreach time based on failed attempts
 * Smart scheduling: try opposite time of day
 */
export function suggestNextOutreachTime(history: LeadNudgeHistory): {
  suggestedSlot: TimeSlot;
  suggestedHour: number;
  reason: string;
} {
  if (history.attempts.length === 0) {
    return {
      suggestedSlot: "morning",
      suggestedHour: 10,
      reason: "Default: Start with morning outreach",
    };
  }

  // Analyze what time slots have been tried
  const attemptHours = history.attempts.map((a) => new Date(a.sentAt).getHours());
  const attemptSlots = attemptHours.map(getTimeSlot);

  // Count attempts per slot
  const slotCounts: Record<TimeSlot, number> = {
    morning: 0,
    midday: 0,
    afternoon: 0,
    evening: 0,
  };
  attemptSlots.forEach((slot) => slotCounts[slot]++);

  // Find most tried slot
  const mostTriedSlot = Object.entries(slotCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a
  )[0] as TimeSlot;

  // Suggest opposite
  const suggestedSlot = getOppositeTimeSlot(mostTriedSlot);
  const slotHours: Record<TimeSlot, number> = {
    morning: 9,
    midday: 12,
    afternoon: 15,
    evening: 18,
  };

  return {
    suggestedSlot,
    suggestedHour: slotHours[suggestedSlot],
    reason: `No response from ${mostTriedSlot} attempts (${slotCounts[mostTriedSlot]}x) - try ${suggestedSlot}`,
  };
}

/**
 * Generate unique nudge attempt ID
 */
export function generateNudgeId(): string {
  return `nudge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new nudge attempt record
 */
export function createNudgeAttempt(
  leadId: string,
  attemptNumber: number,
  messageId?: string,
): NudgeAttempt {
  return {
    nudgeId: generateNudgeId(),
    leadId,
    attemptNumber,
    sentAt: new Date().toISOString(),
    messageId,
    status: "sent",
    template: "nudger",
  };
}

/**
 * Build CATHY nudge message with attempt tracking
 */
export function buildCathyNudgeMessage(
  firstName: string,
  attemptNumber: number,
): { message: string; nudgeId: string } {
  const nudgeId = generateNudgeId();
  const template = GIANNA_RESPONSE_TEMPLATES.find((t) => t.id === "nudger");

  if (!template) {
    return {
      message: `Hey ${firstName}, we tried reaching you ${attemptNumber} times... do we have the right person?? Let us know! - Cathy`,
      nudgeId,
    };
  }

  let message = template.template;
  message = message.replace(/{{first_name}}/g, firstName);
  message = message.replace(/{{attempt_count}}/g, String(attemptNumber));

  return { message, nudgeId };
}

/**
 * Get last outreach attempt for a lead
 * Critical visibility log for Nextier
 */
export function getLastOutreachAttempt(
  history: LeadNudgeHistory,
): NudgeAttempt | null {
  if (history.attempts.length === 0) return null;
  return history.attempts[history.attempts.length - 1];
}

/**
 * Format last outreach for display
 */
export function formatLastOutreach(attempt: NudgeAttempt | null): string {
  if (!attempt) return "No outreach yet";

  const date = new Date(attempt.sentAt);
  const ago = getTimeAgo(date);

  return `Attempt #${attempt.attemptNumber} - ${ago} (${attempt.status})`;
}

/**
 * Helper: Get time ago string
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "just now";
}

/**
 * Get the appropriate GIANNA template for a classification
 */
export function getGiannaTemplate(
  classificationId: string,
): GiannaResponseTemplate | null {
  return (
    GIANNA_RESPONSE_TEMPLATES.find((t) =>
      t.classificationIds.includes(classificationId),
    ) || null
  );
}

/**
 * Get all green-tagged (high priority) responses for GIANNA to focus on
 */
export function getActionableClassifications(
  clientId: string,
): ResponseClassification[] {
  const client = CLIENT_CLASSIFICATIONS.find((c) => c.clientId === clientId);
  if (!client) return [];

  return client.classifications.filter(
    (c) => c.highlight === "green" && !c.suppress,
  );
}

/**
 * Filter messages for AI Inbound Response Center
 * Only returns non-suppressed messages
 */
export function filterForResponseCenter(
  clientId: string,
  messages: Array<{ id: string; content: string; [key: string]: unknown }>,
): Array<{
  id: string;
  content: string;
  classification: ClassificationResult | null;
  highlight: "green" | "yellow" | "red" | "blue" | undefined;
  template: GiannaResponseTemplate | null;
  [key: string]: unknown;
}> {
  return messages
    .map((msg) => {
      const classification = classifyResponse(clientId, msg.content);
      const client = CLIENT_CLASSIFICATIONS.find((c) => c.clientId === clientId);
      const classificationDef = client?.classifications.find(
        (c) => c.id === classification?.classificationId,
      );

      return {
        ...msg,
        classification,
        highlight: classificationDef?.highlight,
        template: classification
          ? getGiannaTemplate(classification.classificationId)
          : null,
        suppress: classificationDef?.suppress,
      };
    })
    .filter((msg) => !msg.suppress); // Remove suppressed messages
}

// Log on import
console.log(
  `[Response Classifications] Loaded ${CLIENT_CLASSIFICATIONS.length} client configurations`,
);
console.log(
  `[Response Classifications] ${GIANNA_RESPONSE_TEMPLATES.length} GIANNA templates ready`,
);
