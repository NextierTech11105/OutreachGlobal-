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
    description: "Background nudge for non-responders - deployed through CATHY with Leslie Nielsen/Henny Youngman humor",
    classificationIds: [], // Outbound only, not triggered by inbound classification
    template: `Hey {{first_name}}, we tried reaching you {{attempt_count}} times... do we have the right person?? Let us know! - Cathy`,
    variables: ["first_name", "attempt_count"],
    automatable: true, // CATHY runs in background automatically
  },
];

// ==========================================
// CATHY HUMOR SYSTEM
// Leslie Nielsen deadpan + Henny Youngman one-liners
// Temperature controls humor intensity via OpenAI
// ==========================================

export type CathyHumorLevel = "mild" | "medium" | "spicy";

export interface CathyPersonality {
  humorLevel: CathyHumorLevel;
  temperature: number; // OpenAI temperature: 0.3 = mild, 0.7 = medium, 1.0 = spicy
  style: "leslie_nielsen" | "henny_youngman" | "mixed";
}

// Pre-written CATHY templates by attempt number (fallback if OpenAI unavailable)
export const CATHY_NUDGE_TEMPLATES: Record<number, string[]> = {
  // Attempt 1: Friendly intro
  1: [
    `Hey {{first_name}}! Cathy here. I'm not saying you're hard to reach, but I've had better luck getting through to my mother-in-law. And she's been screening my calls since '94. Text back? - Cathy`,
    `{{first_name}}! This is Cathy. I called earlier but you didn't pick up. That's ok - my husband doesn't pick up either. I've been married 30 years and I'm still not sure he knows my name. Anyway, got a minute? - Cathy`,
  ],
  // Attempt 2: Light pressure
  2: [
    `{{first_name}}, it's Cathy again. I've reached out twice now. My therapist says I have "attachment issues" but I prefer to call it "professional persistence." Can we chat? - Cathy`,
    `Hey {{first_name}}! Cathy here, attempt #2. I'm starting to feel like a telemarketer and frankly, that's offensive to telemarketers. They at least get hung up on - I'm getting the silent treatment! - Cathy`,
  ],
  // Attempt 3: Getting creative
  3: [
    `{{first_name}}! Third time's the charm, right? That's what I told my third husband. He didn't believe me either. But seriously, just need 2 minutes! - Cathy`,
    `{{first_name}}, Cathy here. Three attempts now. I'm not saying I'm persistent, but I once followed a food truck for 6 blocks because they had good tacos. This is like that, but with less guacamole. - Cathy`,
  ],
  // Attempt 4: Self-deprecating
  4: [
    `{{first_name}}! It's Cathy. Fourth message. At this point I feel like that guy at the party who won't stop talking about his podcast. But unlike him, I actually have something useful to share! - Cathy`,
    `Hey {{first_name}}, Cathy again. My boss asked why I keep texting you. I said "because quitting isn't in my vocabulary." Neither is "boundaries" apparently. Quick call? - Cathy`,
  ],
  // Attempt 5+: Full absurdist
  5: [
    `{{first_name}}! Cathy here, attempt #{{attempt_count}}. I've now texted you more times than I've texted my own kids. They're fine with it - they don't text me back either. Do we have the right number? - Cathy`,
    `{{first_name}}, it's Cathy. Message #{{attempt_count}}. I'm starting to think you're either really busy or you're in witness protection. If it's the second one, blink twice. Otherwise, text back! - Cathy`,
    `Hey {{first_name}}! Cathy again. At this point I'm basically family. Speaking of which, are you coming to Thanksgiving? I'm bringing the persistence. You bring the replies. - Cathy`,
  ],
};

// Context-specific CATHY templates (property, business, value offering)
export const CATHY_CONTEXT_TEMPLATES: Record<string, string[]> = {
  property: [
    `{{first_name}}, Cathy again about {{property_address}}. I've driven by this address more times than my ex. And that's saying something - he lived next door. Quick chat? - Cathy`,
    `Hey {{first_name}}! Still thinking about your place on {{property_street}}. My GPS and I have become very familiar with the route. She doesn't judge. Text back? - Cathy`,
  ],
  business: [
    `{{first_name}}, Cathy here about {{company_name}}. I've looked at more {{industry}} businesses than my accountant looks at spreadsheets. And she LOVES spreadsheets. Got 5 mins? - Cathy`,
    `Hey {{first_name}}! Quick follow-up on {{business_name}}. I've been in this game long enough to know when something's worth my persistence. This is one of those times. - Cathy`,
  ],
  value_offer: [
    `{{first_name}}! Cathy here. Still want to send you that {{value_content}}. It's free, it's useful, and unlike my cooking, it won't disappoint. Just need your email! - Cathy`,
    `Hey {{first_name}}, that {{value_content}} I mentioned? Still got your name on it. My handwriting is terrible but my follow-through is excellent. Email? - Cathy`,
  ],
};

// OpenAI prompt for generating CATHY humor
export const CATHY_OPENAI_SYSTEM_PROMPT = `You are CATHY, a friendly and persistently funny SMS follow-up assistant.

Your humor style combines:
1. LESLIE NIELSEN (Naked Gun/Airplane): Deadpan delivery of absurd statements. Take things literally. Act serious while saying ridiculous things.
2. HENNY YOUNGMAN: Quick one-liners, self-deprecating jokes, observational humor. "Take my wife... please!" energy.

Available variables you can use:
- {{first_name}} - Lead's first name
- {{property_address}} - Property address (if property context)
- {{company_name}} or {{business_name}} - Business name (if business context)
- {{industry}} - Industry type
- {{value_content}} - What you're offering (Property Valuation Report, Exit Strategy Guide, etc.)
- {{attempt_count}} - Number of outreach attempts
- {{agent_signature}} - Sender signature

Rules:
- Keep messages under 160 characters when possible (SMS limit)
- Always end with "- Cathy"
- Reference the attempt number naturally
- Be persistent but never aggressive or rude
- Make fun of YOURSELF, never the recipient
- Include a clear call-to-action (text back, call, etc.)
- No emojis (too corporate)
- Sound like a real person, not a bot
- If property context: reference the address naturally
- If business context: reference the company/industry naturally
- If value_offer context: mention what you're trying to send them

You're following up because you genuinely want to help, but you also can't help being funny about it.`;

export interface CathyContext {
  firstName: string;
  attemptNumber: number;
  humorLevel: CathyHumorLevel;
  // Optional context fields
  propertyAddress?: string;
  companyName?: string;
  businessName?: string;
  industry?: string;
  valueContent?: string;
  campaignContext?: string;
}

export function getCathyOpenAIPrompt(
  firstName: string,
  attemptNumber: number,
  context: string | CathyContext,
  humorLevel: CathyHumorLevel,
): string {
  const intensityGuide = {
    mild: "Keep it professional with just a hint of wit. Think subtle smile, not belly laugh.",
    medium: "Be funny but not over the top. Classic sitcom humor level.",
    spicy: "Full Leslie Nielsen. Absurdist, deadpan, wonderfully ridiculous.",
  };

  // Build context string from object if provided
  let contextString = typeof context === "string" ? context : "";
  let contextType = "general";

  if (typeof context === "object") {
    const parts: string[] = [];
    if (context.propertyAddress) {
      parts.push(`Property: ${context.propertyAddress}`);
      contextType = "property";
    }
    if (context.companyName || context.businessName) {
      parts.push(`Business: ${context.companyName || context.businessName}`);
      contextType = "business";
    }
    if (context.industry) {
      parts.push(`Industry: ${context.industry}`);
    }
    if (context.valueContent) {
      parts.push(`Offering: ${context.valueContent}`);
      contextType = contextType === "general" ? "value_offer" : contextType;
    }
    if (context.campaignContext) {
      parts.push(`Campaign type: ${context.campaignContext}`);
    }
    contextString = parts.join(". ");
  }

  return `Generate a follow-up SMS from CATHY to ${firstName}.

This is attempt #${attemptNumber}.
Context type: ${contextType}
Details: ${contextString || "General follow-up"}
Humor intensity: ${humorLevel} - ${intensityGuide[humorLevel]}

Remember:
- Deadpan delivery, self-deprecating
- Reference the attempt number naturally
- End with "- Cathy"
- If property context: mention the address casually
- If business context: reference the company/industry
- If value_offer: mention what you're sending them`;
}

export function getCathyTemperature(humorLevel: CathyHumorLevel): number {
  const temps: Record<CathyHumorLevel, number> = {
    mild: 0.3,
    medium: 0.7,
    spicy: 1.0,
  };
  return temps[humorLevel];
}

/**
 * Get a pre-written CATHY template (fallback when OpenAI unavailable)
 */
export function getCathyFallbackTemplate(attemptNumber: number): string {
  const templates = CATHY_NUDGE_TEMPLATES[Math.min(attemptNumber, 5)] || CATHY_NUDGE_TEMPLATES[5];
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Get context-specific CATHY template
 */
export function getCathyContextTemplate(
  contextType: "property" | "business" | "value_offer",
): string {
  const templates = CATHY_CONTEXT_TEMPLATES[contextType];
  if (!templates || templates.length === 0) {
    return getCathyFallbackTemplate(1);
  }
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Build CATHY message with full context
 */
export function buildCathyContextMessage(
  context: CathyContext,
  variables: Record<string, string>,
): { message: string; templateUsed: string } {
  // Determine context type
  let contextType: "property" | "business" | "value_offer" | "general" = "general";
  if (context.propertyAddress) contextType = "property";
  else if (context.companyName || context.businessName) contextType = "business";
  else if (context.valueContent) contextType = "value_offer";

  // Get template
  let template: string;
  if (contextType !== "general") {
    template = getCathyContextTemplate(contextType);
  } else {
    template = getCathyFallbackTemplate(context.attemptNumber);
  }

  // Replace all variables
  let message = template;
  const allVars = {
    first_name: context.firstName,
    attempt_count: String(context.attemptNumber),
    property_address: context.propertyAddress || "",
    property_street: context.propertyAddress?.split(",")[0] || "",
    company_name: context.companyName || "",
    business_name: context.businessName || "",
    industry: context.industry || "",
    value_content: context.valueContent || "",
    ...variables,
  };

  for (const [key, value] of Object.entries(allVars)) {
    message = message.replace(new RegExp(`{{${key}}}`, "gi"), value);
  }

  return {
    message,
    templateUsed: `cathy_${contextType}_${context.attemptNumber}`,
  };
}

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
 * Uses pre-written Leslie Nielsen/Henny Youngman style templates
 */
export function buildCathyNudgeMessage(
  firstName: string,
  attemptNumber: number,
  useHumor: boolean = true,
): { message: string; nudgeId: string; templateUsed: string } {
  const nudgeId = generateNudgeId();

  // Use funny templates if humor enabled
  if (useHumor) {
    let template = getCathyFallbackTemplate(attemptNumber);
    template = template.replace(/{{first_name}}/g, firstName);
    template = template.replace(/{{attempt_count}}/g, String(attemptNumber));

    return {
      message: template,
      nudgeId,
      templateUsed: `cathy_humor_attempt_${Math.min(attemptNumber, 5)}`,
    };
  }

  // Fallback: Basic template without humor
  const basicTemplate = GIANNA_RESPONSE_TEMPLATES.find((t) => t.id === "nudger");
  if (!basicTemplate) {
    return {
      message: `Hey ${firstName}, we tried reaching you ${attemptNumber} times... do we have the right person?? Let us know! - Cathy`,
      nudgeId,
      templateUsed: "cathy_basic_fallback",
    };
  }

  let message = basicTemplate.template;
  message = message.replace(/{{first_name}}/g, firstName);
  message = message.replace(/{{attempt_count}}/g, String(attemptNumber));

  return { message, nudgeId, templateUsed: "cathy_basic" };
}

/**
 * Generate CATHY message using OpenAI (async version)
 * Falls back to pre-written templates if OpenAI unavailable
 */
export async function generateCathyMessageWithAI(
  firstName: string,
  attemptNumber: number,
  context: string,
  humorLevel: CathyHumorLevel = "medium",
  openaiApiKey?: string,
): Promise<{ message: string; nudgeId: string; source: "openai" | "fallback" }> {
  const nudgeId = generateNudgeId();

  // If no API key, use fallback
  if (!openaiApiKey) {
    const fallback = buildCathyNudgeMessage(firstName, attemptNumber, true);
    return {
      message: fallback.message,
      nudgeId,
      source: "fallback",
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: CATHY_OPENAI_SYSTEM_PROMPT },
          { role: "user", content: getCathyOpenAIPrompt(firstName, attemptNumber, context, humorLevel) },
        ],
        temperature: getCathyTemperature(humorLevel),
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content?.trim();

    if (aiMessage) {
      return {
        message: aiMessage,
        nudgeId,
        source: "openai",
      };
    }

    throw new Error("No message generated");
  } catch (error) {
    console.warn("[CATHY] OpenAI generation failed, using fallback:", error);
    const fallback = buildCathyNudgeMessage(firstName, attemptNumber, true);
    return {
      message: fallback.message,
      nudgeId,
      source: "fallback",
    };
  }
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
