/**
 * Cold SMS Variance Engine - Reply Gates
 *
 * Defines the post-reply conversation flow and handoff logic.
 * When a lead replies, the system must:
 * 1. Classify the reply intent
 * 2. Determine appropriate next action
 * 3. Handle handoff to Cathy (conversational AI) or human
 *
 * @see docs/COLD_SMS_VARIANCE_ENGINE.md
 */

/**
 * Reply intent classification
 */
export type ReplyIntent =
  | "positive_interest" // "Yes", "Sure", "Tell me more"
  | "qualified_yes" // "Yes, I own [business]", "That's me"
  | "soft_maybe" // "Depends", "What is this about?"
  | "question" // "Who is this?", "What do you want?"
  | "objection" // "Not interested", "Too busy"
  | "negative" // "No", "Stop", "Remove me"
  | "opt_out" // "STOP", "UNSUBSCRIBE", explicit opt-out
  | "wrong_number" // "Wrong number", "I'm not [name]"
  | "already_customer" // "Already using Nextier", "We work together"
  | "competitor" // "I use [competitor]", competitive mention
  | "spam_report" // Carrier-level spam report
  | "unclear"; // Can't classify

/**
 * Gate action to take after reply classification
 */
export type GateAction =
  | "handoff_cathy" // Transfer to Cathy for conversational follow-up
  | "handoff_human" // Escalate to human SDR
  | "auto_respond" // Send automated response
  | "opt_out_process" // Process opt-out and stop messaging
  | "mark_dnc" // Add to Do Not Contact list
  | "update_status" // Update lead status only (no response)
  | "schedule_followup"; // Schedule follow-up attempt

/**
 * Reply gate configuration
 */
export interface ReplyGate {
  intent: ReplyIntent;
  action: GateAction;
  priority: number; // Lower = higher priority
  autoResponse?: string; // If action is auto_respond
  statusUpdate?: string; // Lead status to set
  tags?: string[]; // Tags to add to lead
  notes?: string; // Internal notes
  handoffContext?: string; // Context to pass to next handler
}

/**
 * Reply gate configurations
 * Ordered by priority (lower number = checked first)
 */
export const REPLY_GATES: ReplyGate[] = [
  // Priority 1: Opt-out (TCPA compliance - must process immediately)
  {
    intent: "opt_out",
    action: "opt_out_process",
    priority: 1,
    statusUpdate: "opted_out",
    tags: ["sms_opted_out", "dnc"],
    notes: "Legally required to stop all messaging immediately",
  },

  // Priority 2: Spam report (carrier-level issue)
  {
    intent: "spam_report",
    action: "mark_dnc",
    priority: 2,
    statusUpdate: "spam_reported",
    tags: ["spam_reported", "dnc", "carrier_complaint"],
    notes: "Carrier spam report - must stop and investigate",
  },

  // Priority 3: Wrong number (data quality issue)
  {
    intent: "wrong_number",
    action: "update_status",
    priority: 3,
    statusUpdate: "wrong_number",
    tags: ["wrong_number", "data_issue"],
    notes: "Phone number doesn't match contact - mark for review",
  },

  // Priority 4: Already customer (sales intelligence)
  {
    intent: "already_customer",
    action: "handoff_human",
    priority: 4,
    statusUpdate: "existing_customer",
    tags: ["existing_customer"],
    notes: "Existing relationship - route to account management",
    handoffContext:
      "Lead indicates they are already a customer. Verify account status and handle appropriately.",
  },

  // Priority 5: Qualified yes (hot lead!)
  {
    intent: "qualified_yes",
    action: "handoff_cathy",
    priority: 5,
    statusUpdate: "engaged",
    tags: ["qualified", "hot_lead", "cathy_handoff"],
    notes: "Confirmed business owner interested - high priority",
    handoffContext:
      "Lead confirmed they own the business and showed interest. Cathy should continue conversation toward booking.",
  },

  // Priority 6: Positive interest (warm lead)
  {
    intent: "positive_interest",
    action: "handoff_cathy",
    priority: 6,
    statusUpdate: "interested",
    tags: ["interested", "cathy_handoff"],
    notes: "Showed interest - Cathy to continue nurturing",
    handoffContext:
      "Lead expressed interest. Cathy should qualify further and move toward booking.",
  },

  // Priority 7: Soft maybe (needs nurturing)
  {
    intent: "soft_maybe",
    action: "handoff_cathy",
    priority: 7,
    statusUpdate: "curious",
    tags: ["soft_maybe", "needs_nurturing", "cathy_handoff"],
    notes: "Tentative interest - Cathy to address concerns",
    handoffContext:
      "Lead is on the fence. Cathy should address concerns and provide more context about value.",
  },

  // Priority 8: Question (information seeker)
  {
    intent: "question",
    action: "handoff_cathy",
    priority: 8,
    statusUpdate: "questioning",
    tags: ["has_questions", "cathy_handoff"],
    notes: "Asking questions - Cathy to provide info and qualify",
    handoffContext:
      "Lead has questions. Cathy should answer clearly and transition to qualifying.",
  },

  // Priority 9: Competitor mention (competitive intelligence)
  {
    intent: "competitor",
    action: "handoff_human",
    priority: 9,
    statusUpdate: "using_competitor",
    tags: ["competitor", "competitive_intel"],
    notes: "Using competitor - human SDR to handle carefully",
    handoffContext:
      "Lead mentions using a competitor. SDR should handle with competitive positioning.",
  },

  // Priority 10: Objection (needs skilled handling)
  {
    intent: "objection",
    action: "handoff_cathy",
    priority: 10,
    statusUpdate: "objected",
    tags: ["objection", "cathy_handoff"],
    notes: "Has objection - Cathy to address professionally",
    handoffContext:
      "Lead raised an objection. Cathy should acknowledge, address if possible, or gracefully exit.",
  },

  // Priority 11: Negative (respect their wishes)
  {
    intent: "negative",
    action: "schedule_followup",
    priority: 11,
    statusUpdate: "not_interested",
    tags: ["not_interested"],
    notes: "Not interested now - schedule distant follow-up (90 days)",
  },

  // Priority 12: Unclear (needs classification)
  {
    intent: "unclear",
    action: "handoff_cathy",
    priority: 12,
    statusUpdate: "replied",
    tags: ["unclear_intent", "needs_classification", "cathy_handoff"],
    notes: "Intent unclear - Cathy to interpret and respond",
    handoffContext:
      "Reply intent unclear. Cathy should interpret context and respond appropriately.",
  },
];

/**
 * Keywords for intent classification
 */
interface IntentKeywords {
  intent: ReplyIntent;
  keywords: string[];
  patterns: RegExp[];
}

const INTENT_KEYWORDS: IntentKeywords[] = [
  {
    intent: "opt_out",
    keywords: ["stop", "unsubscribe", "remove", "opt out", "optout", "cancel"],
    patterns: [/^stop$/i, /^stop\s/i, /unsubscribe/i, /remove\s+me/i],
  },
  {
    intent: "wrong_number",
    keywords: ["wrong number", "not me", "wrong person", "don't know"],
    patterns: [
      /wrong\s+number/i,
      /not\s+(?:me|him|her|them)/i,
      /i'?m\s+not\s+\w+/i,
      /don'?t\s+know\s+(?:who|what)/i,
    ],
  },
  {
    intent: "already_customer",
    keywords: [
      "already",
      "work with",
      "using",
      "customer",
      "client",
      "have nextier",
    ],
    patterns: [
      /already\s+(?:using|have|work)/i,
      /we\s+(?:work|partner)\s+together/i,
      /current(?:ly)?\s+(?:use|using|with)/i,
    ],
  },
  {
    intent: "qualified_yes",
    keywords: ["yes that's me", "i own", "my business", "i'm the owner"],
    patterns: [
      /yes[,.]?\s+(?:that'?s?|i'?m)\s+(?:me|the\s+owner)/i,
      /i\s+(?:own|run|manage)\s+(?:the|this|a)/i,
      /still\s+(?:running|operating|have)\s+(?:it|the)/i,
    ],
  },
  {
    intent: "positive_interest",
    keywords: [
      "yes",
      "sure",
      "interested",
      "tell me more",
      "sounds good",
      "ok",
      "okay",
    ],
    patterns: [
      /^yes[.!]?$/i,
      /^sure[.!]?$/i,
      /^ok(?:ay)?[.!]?$/i,
      /tell\s+me\s+more/i,
      /sounds?\s+(?:good|great|interesting)/i,
      /i'?m\s+interested/i,
    ],
  },
  {
    intent: "soft_maybe",
    keywords: ["depends", "maybe", "not sure", "thinking", "possibly"],
    patterns: [
      /^maybe[.!]?$/i,
      /depends?\s+on/i,
      /not\s+sure/i,
      /i'?ll\s+think/i,
      /possibly/i,
      /what'?s?\s+(?:the\s+)?catch/i,
    ],
  },
  {
    intent: "question",
    keywords: ["who is this", "what is this", "what do you", "how did you"],
    patterns: [
      /who\s+(?:is|are)\s+(?:this|you)/i,
      /what\s+(?:is|do)\s+(?:this|you)/i,
      /how\s+did\s+you/i,
      /where\s+did\s+you/i,
      /what'?s?\s+this\s+about/i,
      /\?$/,
    ],
  },
  {
    intent: "objection",
    keywords: ["not interested", "too busy", "bad time", "don't need"],
    patterns: [
      /not\s+interested/i,
      /too\s+busy/i,
      /bad\s+time/i,
      /don'?t\s+need/i,
      /no\s+thanks?/i,
      /not\s+(?:now|right\s+now)/i,
    ],
  },
  {
    intent: "negative",
    keywords: ["no", "nope", "pass", "not for me"],
    patterns: [
      /^no[.!]?$/i,
      /^nope[.!]?$/i,
      /^pass[.!]?$/i,
      /not\s+for\s+me/i,
      /leave\s+me\s+alone/i,
    ],
  },
  {
    intent: "competitor",
    keywords: ["using", "have", "work with", "already have"],
    patterns: [
      /(?:using|use|have|with)\s+(?:another|different|a)\s+(?:company|service|provider)/i,
      /already\s+have\s+(?:someone|a\s+company)/i,
    ],
  },
];

/**
 * Classify reply intent based on message content
 */
export function classifyReplyIntent(message: string): {
  intent: ReplyIntent;
  confidence: "high" | "medium" | "low";
  matchedPatterns: string[];
} {
  const normalizedMessage = message.toLowerCase().trim();
  const matchedPatterns: string[] = [];

  // Check each intent in priority order
  for (const intentConfig of INTENT_KEYWORDS) {
    // Check exact keywords
    for (const keyword of intentConfig.keywords) {
      if (normalizedMessage.includes(keyword)) {
        matchedPatterns.push(`keyword: ${keyword}`);
      }
    }

    // Check regex patterns
    for (const pattern of intentConfig.patterns) {
      if (pattern.test(message)) {
        matchedPatterns.push(`pattern: ${pattern.source}`);
      }
    }

    // If we have matches, return this intent
    if (matchedPatterns.length > 0) {
      const confidence =
        matchedPatterns.length >= 2
          ? "high"
          : matchedPatterns.length === 1
            ? "medium"
            : "low";
      return {
        intent: intentConfig.intent,
        confidence,
        matchedPatterns,
      };
    }
  }

  // Default to unclear if no matches
  return {
    intent: "unclear",
    confidence: "low",
    matchedPatterns: [],
  };
}

/**
 * Get gate configuration for an intent
 */
export function getGateForIntent(intent: ReplyIntent): ReplyGate {
  return REPLY_GATES.find((gate) => gate.intent === intent)!;
}

/**
 * Process a reply and determine action
 */
export interface ReplyProcessingResult {
  intent: ReplyIntent;
  confidence: "high" | "medium" | "low";
  gate: ReplyGate;
  action: GateAction;
  statusUpdate?: string;
  tags: string[];
  handoffContext?: string;
  autoResponse?: string;
  followUpDays?: number;
}

export function processReply(message: string): ReplyProcessingResult {
  // Classify intent
  const classification = classifyReplyIntent(message);

  // Get gate configuration
  const gate = getGateForIntent(classification.intent);

  // Determine follow-up timing for negative responses
  let followUpDays: number | undefined;
  if (gate.action === "schedule_followup") {
    followUpDays = 90; // 90-day cooldown for "not interested"
  }

  return {
    intent: classification.intent,
    confidence: classification.confidence,
    gate,
    action: gate.action,
    statusUpdate: gate.statusUpdate,
    tags: gate.tags || [],
    handoffContext: gate.handoffContext,
    autoResponse: gate.autoResponse,
    followUpDays,
  };
}

/**
 * Auto-responses for specific intents
 * These are used when action is "auto_respond"
 */
export const AUTO_RESPONSES: Record<string, string> = {
  opt_out_confirm:
    "You've been removed from our list. Reply START to resubscribe anytime.",
  wrong_number_ack:
    "Sorry for the confusion! We'll update our records. Have a great day.",
};

/**
 * Handoff message templates for Cathy
 */
export interface CathyHandoffContext {
  originalMessage: string;
  replyMessage: string;
  intent: ReplyIntent;
  confidence: "high" | "medium" | "low";
  leadContext: {
    firstName: string;
    businessName: string;
    previousAttempts: number;
  };
  suggestedApproach: string;
}

/**
 * Generate handoff context for Cathy
 */
export function generateCathyHandoff(
  originalMessage: string,
  replyMessage: string,
  leadFirstName: string,
  businessName: string,
  previousAttempts: number,
): CathyHandoffContext {
  const classification = classifyReplyIntent(replyMessage);
  const gate = getGateForIntent(classification.intent);

  // Generate suggested approach based on intent
  let suggestedApproach: string;
  switch (classification.intent) {
    case "positive_interest":
      suggestedApproach = `${leadFirstName} is interested. Qualify their needs and propose a brief call.`;
      break;
    case "qualified_yes":
      suggestedApproach = `${leadFirstName} confirmed they own ${businessName}. Move directly toward booking a discovery call.`;
      break;
    case "soft_maybe":
      suggestedApproach = `${leadFirstName} is hesitant. Address any concerns and provide specific value context.`;
      break;
    case "question":
      suggestedApproach = `${leadFirstName} has questions. Answer clearly, then pivot back to qualifying their needs.`;
      break;
    case "objection":
      suggestedApproach = `${leadFirstName} raised an objection. Acknowledge it, address if possible, or gracefully exit.`;
      break;
    case "unclear":
    default:
      suggestedApproach = `Intent unclear. Interpret ${leadFirstName}'s message in context and respond appropriately.`;
  }

  return {
    originalMessage,
    replyMessage,
    intent: classification.intent,
    confidence: classification.confidence,
    leadContext: {
      firstName: leadFirstName,
      businessName,
      previousAttempts,
    },
    suggestedApproach,
  };
}

/**
 * Statistics for reply analysis
 */
export function getReplyStats(
  replies: Array<{ message: string; timestamp: Date }>,
): {
  total: number;
  byIntent: Record<ReplyIntent, number>;
  byAction: Record<GateAction, number>;
  positiveRate: number;
  optOutRate: number;
} {
  const byIntent: Record<string, number> = {};
  const byAction: Record<string, number> = {};
  let positive = 0;
  let optOut = 0;

  for (const reply of replies) {
    const result = processReply(reply.message);

    byIntent[result.intent] = (byIntent[result.intent] || 0) + 1;
    byAction[result.action] = (byAction[result.action] || 0) + 1;

    if (
      ["positive_interest", "qualified_yes", "soft_maybe"].includes(
        result.intent,
      )
    ) {
      positive++;
    }

    if (result.intent === "opt_out") {
      optOut++;
    }
  }

  return {
    total: replies.length,
    byIntent: byIntent as Record<ReplyIntent, number>,
    byAction: byAction as Record<GateAction, number>,
    positiveRate: replies.length > 0 ? positive / replies.length : 0,
    optOutRate: replies.length > 0 ? optOut / replies.length : 0,
  };
}
