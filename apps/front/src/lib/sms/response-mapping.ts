/**
 * SMS Response Mapping
 *
 * Maps inbound responses back to:
 * - Original campaign ID
 * - Original template ID
 * - Lead record
 * - AI Worker for contextual response
 *
 * This enables the Inbound Response Generation Machine to:
 * 1. Understand context of what was said
 * 2. Classify responses (YES, NO, EMAIL, OPT-OUT)
 * 3. Route to correct AI worker
 * 4. Trigger stage progression (Initial → Follow-up)
 * 5. Flag GOLD LABEL leads (email captured)
 */

import { CampaignStage, AIWorker, SMSTemplate } from "./campaign-templates";

// ============================================================================
// TYPES
// ============================================================================

export interface OutboundMessage {
  id: string;
  messageSid: string; // SignalHouse message ID
  campaignId: string;
  templateId: string;
  templateName: string;
  leadId: string;
  fromPhone: string; // Our number
  toPhone: string; // Lead's number
  body: string;
  sentAt: Date;
  stage: CampaignStage;
  worker: AIWorker;
}

export interface InboundMessage {
  id: string;
  messageSid: string;
  fromPhone: string; // Lead's number
  toPhone: string; // Our number
  body: string;
  receivedAt: Date;
  // Mapped fields (populated after lookup)
  leadId?: string;
  campaignId?: string;
  templateId?: string;
  originalMessage?: OutboundMessage;
}

export interface ResponseClassification {
  type: ResponseType;
  confidence: number;
  goldLabel: boolean; // Email captured
  email?: string; // Extracted email
  intent: ResponseIntent;
  suggestedAction: SuggestedAction;
  nextWorker: AIWorker;
  nextStage: CampaignStage;
}

export type ResponseType =
  | "positive" // YES, interested, call me
  | "negative" // NO, not interested
  | "question" // Asking for more info
  | "email_capture" // Provided email → GOLD LABEL
  | "phone_confirm" // Confirmed mobile
  | "opt_out" // STOP, unsubscribe
  | "reschedule" // Can't make it, reschedule
  | "unclear"; // Needs human review

export type ResponseIntent =
  | "interested"
  | "not_interested"
  | "curious"
  | "needs_info"
  | "ready_to_meet"
  | "wants_callback"
  | "opt_out"
  | "unknown";

export type SuggestedAction =
  | "send_to_followup" // Move to SABRINA
  | "push_to_call_queue" // Immediate call
  | "schedule_meeting" // Send calendar link
  | "send_email" // Email follow-up
  | "opt_out" // Remove from SMS
  | "nudge_later" // Schedule nudge
  | "retarget_later" // Add to retarget queue
  | "human_review"; // Escalate to human

// ============================================================================
// RESPONSE CLASSIFICATION PATTERNS
// ============================================================================

const POSITIVE_PATTERNS = [
  /\byes\b/i,
  /\byeah\b/i,
  /\byep\b/i,
  /\bsure\b/i,
  /\binterested\b/i,
  /\bsounds good\b/i,
  /\btell me more\b/i,
  /\bcall me\b/i,
  /\bwhen.*available\b/i,
  /\blet'?s talk\b/i,
  /\bset up.*call\b/i,
  /\bschedule\b/i,
  /\bwhat time\b/i,
  /\bfree.*chat\b/i,
  /\bhow much\b/i,
  /\bwhat's.*worth\b/i,
  /\bget.*valuation\b/i,
];

const NEGATIVE_PATTERNS = [
  /\bno\b/i,
  /\bnope\b/i,
  /\bnot interested\b/i,
  /\bnot now\b/i,
  /\bmaybe later\b/i,
  /\bwrong number\b/i,
  /\bremove me\b/i,
  /\bdon'?t contact\b/i,
  /\bleave me alone\b/i,
  /\bnot selling\b/i,
  /\bnot looking\b/i,
];

const OPT_OUT_PATTERNS = [
  /\bstop\b/i,
  /\bunsubscribe\b/i,
  /\bcancel\b/i,
  /\bend\b/i,
  /\bquit\b/i,
  /\bopt.?out\b/i,
  /\bremove\b/i,
];

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;

const QUESTION_PATTERNS = [
  /\bwhat.*\?/i,
  /\bhow.*\?/i,
  /\bwhy.*\?/i,
  /\bwhen.*\?/i,
  /\bwho.*\?/i,
  /\bcan you.*\?/i,
  /\bdo you.*\?/i,
  /\btell me.*\?/i,
];

// ============================================================================
// CLASSIFICATION FUNCTIONS
// ============================================================================

/**
 * Classify an inbound SMS response
 */
export function classifyResponse(
  body: string,
  originalMessage?: OutboundMessage,
): ResponseClassification {
  const normalized = body.trim().toLowerCase();

  // Check for opt-out first (highest priority)
  if (OPT_OUT_PATTERNS.some((p) => p.test(normalized))) {
    return {
      type: "opt_out",
      confidence: 1.0,
      goldLabel: false,
      intent: "opt_out",
      suggestedAction: "opt_out",
      nextWorker: "APPOINTMENT_BOT",
      nextStage: "initial", // Stay in current stage but mark opted out
    };
  }

  // Check for email capture → GOLD LABEL
  const emailMatch = body.match(EMAIL_PATTERN);
  if (emailMatch) {
    return {
      type: "email_capture",
      confidence: 1.0,
      goldLabel: true, // 🏆 GOLD LABEL!
      email: emailMatch[0],
      intent: "interested",
      suggestedAction: "send_to_followup",
      nextWorker: "SABRINA",
      nextStage: "followup",
    };
  }

  // Check for positive response
  if (POSITIVE_PATTERNS.some((p) => p.test(normalized))) {
    return {
      type: "positive",
      confidence: 0.9,
      goldLabel: false,
      intent: "interested",
      suggestedAction: "push_to_call_queue",
      nextWorker: "SABRINA",
      nextStage: "followup",
    };
  }

  // Check for negative response
  if (NEGATIVE_PATTERNS.some((p) => p.test(normalized))) {
    return {
      type: "negative",
      confidence: 0.85,
      goldLabel: false,
      intent: "not_interested",
      suggestedAction: "retarget_later",
      nextWorker: "CATHY",
      nextStage: "retarget",
    };
  }

  // Check for question
  if (QUESTION_PATTERNS.some((p) => p.test(normalized))) {
    return {
      type: "question",
      confidence: 0.8,
      goldLabel: false,
      intent: "curious",
      suggestedAction: "human_review",
      nextWorker: "SABRINA",
      nextStage: "followup",
    };
  }

  // Unclear response - needs human review
  return {
    type: "unclear",
    confidence: 0.5,
    goldLabel: false,
    intent: "unknown",
    suggestedAction: "human_review",
    nextWorker: originalMessage?.worker || "GIANNA",
    nextStage: originalMessage?.stage || "initial",
  };
}

/**
 * Extract email from message body
 */
export function extractEmail(body: string): string | null {
  const match = body.match(EMAIL_PATTERN);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Check if message is opt-out
 */
export function isOptOut(body: string): boolean {
  return OPT_OUT_PATTERNS.some((p) => p.test(body.toLowerCase()));
}

/**
 * Check if message is positive response
 */
export function isPositive(body: string): boolean {
  return POSITIVE_PATTERNS.some((p) => p.test(body.toLowerCase()));
}

/**
 * Check if email was captured → GOLD LABEL
 */
export function isGoldLabel(body: string): boolean {
  return EMAIL_PATTERN.test(body);
}

// ============================================================================
// STAGE PROGRESSION LOGIC
// ============================================================================

export interface StageProgression {
  currentStage: CampaignStage;
  nextStage: CampaignStage;
  reason: string;
  worker: AIWorker;
}

/**
 * Determine next stage based on response
 */
export function determineNextStage(
  currentStage: CampaignStage,
  classification: ResponseClassification,
): StageProgression {
  // GOLD LABEL always goes to follow-up with SABRINA
  if (classification.goldLabel) {
    return {
      currentStage,
      nextStage: "followup",
      reason: "Email captured - GOLD LABEL",
      worker: "SABRINA",
    };
  }

  // Opt-out stays in current but marked
  if (classification.type === "opt_out") {
    return {
      currentStage,
      nextStage: currentStage,
      reason: "Opted out - no further contact",
      worker: "APPOINTMENT_BOT",
    };
  }

  // Positive response → Follow-up
  if (classification.type === "positive") {
    return {
      currentStage,
      nextStage: "followup",
      reason: "Positive response - push to meeting",
      worker: "SABRINA",
    };
  }

  // Negative response → Retarget later
  if (classification.type === "negative") {
    return {
      currentStage,
      nextStage: "retarget",
      reason: "Negative response - retarget in 7+ days",
      worker: "CATHY",
    };
  }

  // Question → Stay in flow, respond with info
  if (classification.type === "question") {
    return {
      currentStage,
      nextStage: currentStage === "initial" ? "nudge" : currentStage,
      reason: "Question asked - provide info",
      worker: currentStage === "initial" ? "GIANNA" : "CATHY",
    };
  }

  // Default: nudge
  return {
    currentStage,
    nextStage: "nudge",
    reason: "Unclear response - nudge for clarity",
    worker: "CATHY",
  };
}

// ============================================================================
// CONVERSATION CONTEXT
// ============================================================================

export interface ConversationContext {
  leadId: string;
  campaignId: string;
  currentStage: CampaignStage;
  assignedWorker: AIWorker;
  messages: Array<{
    direction: "outbound" | "inbound";
    body: string;
    templateId?: string;
    timestamp: Date;
  }>;
  lastOutboundTemplate?: SMSTemplate;
  responseClassification?: ResponseClassification;
  isGoldLabel: boolean;
  optedOut: boolean;
}

/**
 * Build conversation context for AI worker
 */
export function buildConversationContext(
  outboundMessages: OutboundMessage[],
  inboundMessages: InboundMessage[],
): ConversationContext | null {
  if (outboundMessages.length === 0) {
    return null;
  }

  const lastOutbound = outboundMessages[outboundMessages.length - 1];
  const lastInbound = inboundMessages[inboundMessages.length - 1];

  // Combine and sort messages
  const allMessages = [
    ...outboundMessages.map((m) => ({
      direction: "outbound" as const,
      body: m.body,
      templateId: m.templateId,
      timestamp: m.sentAt,
    })),
    ...inboundMessages.map((m) => ({
      direction: "inbound" as const,
      body: m.body,
      timestamp: m.receivedAt,
    })),
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Classify the last inbound response
  const classification = lastInbound
    ? classifyResponse(lastInbound.body, lastOutbound)
    : undefined;

  return {
    leadId: lastOutbound.leadId,
    campaignId: lastOutbound.campaignId,
    currentStage: lastOutbound.stage,
    assignedWorker: lastOutbound.worker,
    messages: allMessages,
    responseClassification: classification,
    isGoldLabel: classification?.goldLabel || false,
    optedOut: classification?.type === "opt_out",
  };
}

// ============================================================================
// WEBHOOK HANDLER HELPERS
// ============================================================================

/**
 * Process inbound SMS from SignalHouse webhook
 */
export async function processInboundSMS(
  fromPhone: string,
  toPhone: string,
  body: string,
  lookupOutboundFn: (toPhone: string) => Promise<OutboundMessage | null>,
): Promise<{
  context: ConversationContext | null;
  classification: ResponseClassification;
  action: SuggestedAction;
}> {
  // Look up the original outbound message
  const originalMessage = await lookupOutboundFn(fromPhone);

  // Classify the response
  const classification = classifyResponse(body, originalMessage || undefined);

  // Build context if we have an original message
  const context = originalMessage
    ? {
        leadId: originalMessage.leadId,
        campaignId: originalMessage.campaignId,
        currentStage: originalMessage.stage,
        assignedWorker: originalMessage.worker,
        messages: [
          {
            direction: "outbound" as const,
            body: originalMessage.body,
            templateId: originalMessage.templateId,
            timestamp: originalMessage.sentAt,
          },
          {
            direction: "inbound" as const,
            body,
            timestamp: new Date(),
          },
        ],
        responseClassification: classification,
        isGoldLabel: classification.goldLabel,
        optedOut: classification.type === "opt_out",
      }
    : null;

  return {
    context,
    classification,
    action: classification.suggestedAction,
  };
}

// ============================================================================
// ANALYTICS HELPERS
// ============================================================================

export interface TemplatePerformance {
  templateId: string;
  templateName: string;
  sent: number;
  responses: number;
  responseRate: number;
  positiveResponses: number;
  positiveRate: number;
  goldLabels: number;
  goldLabelRate: number;
  optOuts: number;
  optOutRate: number;
}

/**
 * Calculate template performance metrics
 */
export function calculateTemplatePerformance(
  templateId: string,
  templateName: string,
  outboundMessages: OutboundMessage[],
  inboundMessages: InboundMessage[],
): TemplatePerformance {
  // Filter messages for this template
  const templateOutbound = outboundMessages.filter(
    (m) => m.templateId === templateId,
  );
  const sent = templateOutbound.length;

  if (sent === 0) {
    return {
      templateId,
      templateName,
      sent: 0,
      responses: 0,
      responseRate: 0,
      positiveResponses: 0,
      positiveRate: 0,
      goldLabels: 0,
      goldLabelRate: 0,
      optOuts: 0,
      optOutRate: 0,
    };
  }

  // Find responses to these outbound messages
  const responsePhones = new Set(templateOutbound.map((m) => m.toPhone));
  const responses = inboundMessages.filter((m) =>
    responsePhones.has(m.fromPhone),
  );

  // Classify responses
  let positiveCount = 0;
  let goldLabelCount = 0;
  let optOutCount = 0;

  for (const response of responses) {
    const classification = classifyResponse(response.body);
    if (classification.type === "positive" || classification.goldLabel) {
      positiveCount++;
    }
    if (classification.goldLabel) {
      goldLabelCount++;
    }
    if (classification.type === "opt_out") {
      optOutCount++;
    }
  }

  return {
    templateId,
    templateName,
    sent,
    responses: responses.length,
    responseRate: responses.length / sent,
    positiveResponses: positiveCount,
    positiveRate: positiveCount / sent,
    goldLabels: goldLabelCount,
    goldLabelRate: goldLabelCount / sent,
    optOuts: optOutCount,
    optOutRate: optOutCount / sent,
  };
}
