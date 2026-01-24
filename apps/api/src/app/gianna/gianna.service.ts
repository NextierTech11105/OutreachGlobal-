import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  leadsTable,
  messagesTable,
  campaignsTable,
} from "@/database/schema-alias";
import { MessageDirection, MessageType } from "@nextier/common";
import { GIANNA_QUEUE } from "./gianna.module";
import { AiOrchestratorService } from "../ai-orchestrator/ai-orchestrator.service";
import { v4 as uuid } from "uuid";

/**
 * GIANNA SERVICE
 *
 * The SMS Opener Agent - First contact specialist
 *
 * GIANNA handles:
 * - Cold SMS outreach with template-based messages
 * - Response classification
 * - Initial objection handling
 * - Escalation to CATHY (nurture) or SABRINA (closer) based on intent
 *
 * Mode: Template-based by default (no AI), with optional AI fallback
 * Human-in-Loop: Required when confidence < 70%
 */

// Personality presets for GIANNA
export const GIANNA_PRESETS = {
  balanced: {
    warmth: 70,
    directness: 60,
    humor: 40,
    formality: 30,
    urgency: 50,
    assertiveness: 65,
    empathy: 70,
  },
  cold_outreach: {
    warmth: 75,
    directness: 70,
    humor: 30,
    formality: 40,
    urgency: 40,
    assertiveness: 60,
    empathy: 50,
  },
  warm_lead: {
    warmth: 85,
    directness: 75,
    humor: 50,
    formality: 25,
    urgency: 60,
    assertiveness: 75,
    empathy: 60,
  },
  ghost_revival: {
    warmth: 60,
    directness: 85,
    humor: 60,
    formality: 20,
    urgency: 70,
    assertiveness: 70,
    empathy: 40,
  },
};

// Response strategies by intent
export const RESPONSE_STRATEGIES = {
  interested: {
    goal: "Lock in a call or get their email",
    templates: [
      "Perfect! What's the best number to reach you at? I can call you in the next 15 mins.",
      "Great — I'll send that over. Best email for you?",
      "Love it. Want me to call you now or later today?",
    ],
  },
  question: {
    goal: "Answer briefly, then redirect to call",
    templates: [
      "Good question — easier to explain in a quick call. Free in the next 10?",
      "Short answer depends on a few things. Mind if I call you quick to walk through it?",
    ],
  },
  soft_no: {
    goal: "Understand why, leave door open",
    templates: [
      "Totally understand. Timing's everything. Mind if I check back in a few months?",
      "No problem at all. Would it be okay to reach out if something changes?",
    ],
  },
  hard_no: {
    goal: "Exit gracefully",
    templates: [
      "Understood — I'll remove you from the list. Best of luck!",
      "No worries. Thanks for letting me know.",
    ],
  },
  opt_out: {
    goal: "Immediate compliance",
    templates: [
      "Done — you're off the list. Sorry for the bother.",
      "Removed. Take care!",
    ],
  },
};

// Objection handlers
export const OBJECTION_RESPONSES = {
  not_interested: [
    "Totally get it. Most folks I talk to say that at first. Mind if I ask — is it timing or just not on your radar?",
    "No pressure at all. Quick question though — have you ever thought about what your options look like?",
  ],
  too_busy: [
    "I hear you — running a business is no joke. This literally takes 5 mins. When's better?",
    "Totally understand. I'll keep it super quick. Would 10 mins tomorrow work better?",
  ],
  send_email: [
    "Happy to. Best email for you?",
    "Sure thing — what's the best email to reach you?",
  ],
  how_got_number: [
    "Public business records — I help owners understand their options. Want me to remove you?",
    "Business databases — totally understand if you want off the list. Just say the word.",
  ],
  scam_accusation: [
    "I get why you'd be skeptical — lots of junk out there. We're a real company. Happy to send you our info.",
    "Totally fair. You can Google us — Nextier. I'll wait.",
  ],
};

// Opener templates by category
export const OPENER_TEMPLATES = {
  property: [
    "Hey {firstName}, noticed {propertyAddress} came up in my search. Any interest in seeing what it's worth?",
    "Hi {firstName} — quick question about {propertyAddress}. Ever thought about your options?",
  ],
  business: [
    "Hey {firstName}, I help business owners in {industry} explore their options. Worth a quick chat?",
    "Hi {firstName} — I work with {industry} businesses. Curious if you've ever thought about what yours is worth?",
  ],
  general: [
    "Hey {firstName}! Quick question — have you thought about your options recently?",
    "Hi {firstName}, I help folks like you explore their options. Got a sec?",
  ],
};

export interface GiannaContext {
  teamId: string;
  leadId: string;
  campaignId?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  industry?: string;
  propertyAddress?: string;
  phone: string;
  email?: string;
  messageNumber: number;
  daysSinceLastContact?: number;
  leadType?: string;
}

export interface GiannaResponse {
  message: string;
  confidence: number;
  intent?: string;
  requiresHumanReview: boolean;
  nextAction?: {
    type:
      | "wait"
      | "follow_up"
      | "schedule_call"
      | "escalate_cathy"
      | "escalate_sabrina"
      | "add_to_dnc";
    delayMinutes?: number;
    metadata?: Record<string, unknown>;
  };
  alternatives?: string[];
}

export interface ClassificationResult {
  intent: string;
  confidence: number;
  objectionType?: string;
  sentiment: "positive" | "negative" | "neutral";
  suggestedAgent: "gianna" | "cathy" | "sabrina";
}

@Injectable()
export class GiannaService {
  private readonly logger = new Logger(GiannaService.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    @InjectQueue(GIANNA_QUEUE) private giannaQueue: Queue,
    private aiOrchestrator: AiOrchestratorService,
  ) {}

  /**
   * Generate an opener message for cold outreach
   */
  async generateOpener(
    context: GiannaContext,
    category: "property" | "business" | "general" = "general",
  ): Promise<GiannaResponse> {
    const templates = OPENER_TEMPLATES[category] || OPENER_TEMPLATES.general;
    const template = templates[Math.floor(Math.random() * templates.length)];

    const message = this.applyTemplate(template, context);

    return {
      message,
      confidence: 100,
      requiresHumanReview: false,
      nextAction: { type: "wait" },
    };
  }

  /**
   * Process an incoming response and generate appropriate reply
   */
  async processIncomingResponse(
    incomingMessage: string,
    context: GiannaContext,
  ): Promise<GiannaResponse> {
    // Step 1: Classify the incoming message
    const classification = this.classifyResponse(
      incomingMessage,
      context.messageNumber,
    );
    this.logger.log(
      `[GIANNA] Classification: ${classification.intent} (${classification.confidence}%) - ${classification.sentiment}`,
    );

    // Step 2: Handle opt-out immediately (compliance)
    if (classification.intent === "opt_out") {
      return this.handleOptOut(context);
    }

    // Step 3: Check for objection
    if (classification.objectionType) {
      return this.handleObjection(
        classification.objectionType,
        context,
        classification,
      );
    }

    // Step 4: Route based on classification
    if (classification.suggestedAgent === "sabrina") {
      return this.escalateToSabrina(incomingMessage, context, classification);
    }

    if (classification.suggestedAgent === "cathy") {
      return this.escalateToCathy(context, classification);
    }

    // Step 5: Generate template-based response
    const strategy =
      RESPONSE_STRATEGIES[
        classification.intent as keyof typeof RESPONSE_STRATEGIES
      ];
    if (strategy) {
      const templates = strategy.templates;
      const template = templates[Math.floor(Math.random() * templates.length)];
      const message = this.applyTemplate(template, context);

      return {
        message,
        confidence: classification.confidence,
        intent: classification.intent,
        requiresHumanReview: classification.confidence < 70,
        nextAction: this.determineNextAction(classification, context),
        alternatives: templates
          .slice(0, 3)
          .map((t) => this.applyTemplate(t, context)),
      };
    }

    // Step 6: Fallback to AI if no template matches
    return this.generateAIResponse(incomingMessage, context, classification);
  }

  /**
   * Classify incoming message intent
   */
  classifyResponse(message: string, messageNumber = 1): ClassificationResult {
    const lower = message.toLowerCase().trim();

    // Opt-out detection (highest priority - compliance)
    if (
      /\b(stop|unsubscribe|cancel|end|quit|optout|opt out|remove|no more|don't text|dont text)\b/i.test(
        lower,
      )
    ) {
      return {
        intent: "opt_out",
        confidence: 100,
        sentiment: "negative",
        suggestedAgent: "gianna",
      };
    }

    // Angry/upset detection
    if (
      /\b(fuck|shit|scam|spam|fraud|leave me alone|piss off)\b/i.test(lower)
    ) {
      return {
        intent: "anger",
        confidence: 95,
        sentiment: "negative",
        suggestedAgent: "gianna",
      };
    }

    // Positive/interested detection → escalate to SABRINA
    if (
      /\b(yes|yeah|yep|interested|call|info|more|details|help|please|sounds good|tell me|okay|ok|sure)\b/i.test(
        lower,
      )
    ) {
      return {
        intent: "interested",
        confidence: 85,
        sentiment: "positive",
        suggestedAgent: "sabrina", // High intent → closer
      };
    }

    // Schedule request → SABRINA
    if (
      /\b(schedule|meet|call me|time|when|calendar|appointment|available|book)\b/i.test(
        lower,
      )
    ) {
      return {
        intent: "wants_call",
        confidence: 90,
        sentiment: "positive",
        suggestedAgent: "sabrina",
      };
    }

    // Question detection
    if (
      lower.includes("?") ||
      /\b(what|how|when|where|why|who|which)\b/i.test(lower)
    ) {
      return {
        intent: "question",
        confidence: 75,
        sentiment: "neutral",
        suggestedAgent: messageNumber > 3 ? "cathy" : "gianna",
      };
    }

    // Objection detection
    const objectionType = this.detectObjection(lower);
    if (objectionType) {
      return {
        intent: "objection",
        confidence: 80,
        objectionType,
        sentiment: "negative",
        suggestedAgent: "gianna", // GIANNA handles first objection
      };
    }

    // Soft no
    if (
      /\b(not interested|no thanks|pass|not now|maybe later)\b/i.test(lower)
    ) {
      return {
        intent: "soft_no",
        confidence: 80,
        sentiment: "negative",
        suggestedAgent: messageNumber > 2 ? "cathy" : "gianna",
      };
    }

    // Hard no
    if (/\b(never|absolutely not|no way|hell no)\b/i.test(lower)) {
      return {
        intent: "hard_no",
        confidence: 90,
        sentiment: "negative",
        suggestedAgent: "gianna",
      };
    }

    // Default: neutral response → may need nurturing
    return {
      intent: "neutral",
      confidence: 50,
      sentiment: "neutral",
      suggestedAgent: messageNumber > 2 ? "cathy" : "gianna",
    };
  }

  /**
   * Detect objection type from message
   */
  private detectObjection(message: string): string | undefined {
    const lower = message.toLowerCase();

    if (/\b(not interested|no thanks|pass)\b/i.test(lower)) {
      return "not_interested";
    }
    if (/\b(busy|don't have time|not now)\b/i.test(lower)) {
      return "too_busy";
    }
    if (/\b(send|email)\b/i.test(lower) && lower.includes("email")) {
      return "send_email";
    }
    if (
      /\b(how|got my|find me|number)\b/i.test(lower) &&
      lower.includes("number")
    ) {
      return "how_got_number";
    }
    if (/\b(scam|fraud|fake)\b/i.test(lower)) {
      return "scam_accusation";
    }

    return undefined;
  }

  /**
   * Handle objection with appropriate response
   */
  private handleObjection(
    objectionType: string,
    context: GiannaContext,
    classification: ClassificationResult,
  ): GiannaResponse {
    const responses =
      OBJECTION_RESPONSES[objectionType as keyof typeof OBJECTION_RESPONSES];

    if (!responses) {
      return {
        message: "I understand. Let me know if anything changes.",
        confidence: 60,
        intent: "objection_unknown",
        requiresHumanReview: true,
      };
    }

    const message = responses[Math.floor(Math.random() * responses.length)];
    const finalMessage = this.applyTemplate(message, context);

    // First 3 objections need human review
    const requiresHumanReview = context.messageNumber <= 3;

    return {
      message: finalMessage,
      confidence: 75,
      intent: `objection_${objectionType}`,
      requiresHumanReview,
      alternatives: responses
        .slice(0, 3)
        .map((r) => this.applyTemplate(r, context)),
      nextAction:
        objectionType === "not_interested" && context.messageNumber >= 3
          ? { type: "follow_up", delayMinutes: 90 * 24 * 60 } // 90 days
          : { type: "wait" },
    };
  }

  /**
   * Handle opt-out request
   */
  private handleOptOut(context: GiannaContext): GiannaResponse {
    const templates = RESPONSE_STRATEGIES.opt_out.templates;
    const message = templates[Math.floor(Math.random() * templates.length)];

    return {
      message,
      confidence: 100,
      intent: "opt_out",
      requiresHumanReview: false,
      nextAction: {
        type: "add_to_dnc",
        metadata: { phone: context.phone, leadId: context.leadId },
      },
    };
  }

  /**
   * Escalate to SABRINA for high-intent/scheduling
   */
  private escalateToSabrina(
    incomingMessage: string,
    context: GiannaContext,
    classification: ClassificationResult,
  ): GiannaResponse {
    this.logger.log(
      `[GIANNA] Escalating to SABRINA: ${classification.intent} for lead ${context.leadId}`,
    );

    // Queue for SABRINA processing
    this.giannaQueue.add("escalate-sabrina", {
      leadId: context.leadId,
      teamId: context.teamId,
      incomingMessage,
      classification,
      context,
    });

    return {
      message: "", // SABRINA will generate the response
      confidence: classification.confidence,
      intent: classification.intent,
      requiresHumanReview: false,
      nextAction: {
        type: "escalate_sabrina",
        metadata: { reason: classification.intent },
      },
    };
  }

  /**
   * Escalate to CATHY for nurturing
   */
  private escalateToCathy(
    context: GiannaContext,
    classification: ClassificationResult,
  ): GiannaResponse {
    this.logger.log(
      `[GIANNA] Escalating to CATHY: nurture needed for lead ${context.leadId}`,
    );

    // Queue for CATHY processing
    this.giannaQueue.add("escalate-cathy", {
      leadId: context.leadId,
      teamId: context.teamId,
      classification,
      context,
    });

    return {
      message: "", // CATHY will generate the response
      confidence: classification.confidence,
      intent: classification.intent,
      requiresHumanReview: false,
      nextAction: {
        type: "escalate_cathy",
        metadata: { reason: "nurture_needed" },
      },
    };
  }

  /**
   * Generate AI response as fallback
   */
  private async generateAIResponse(
    incomingMessage: string,
    context: GiannaContext,
    classification: ClassificationResult,
  ): Promise<GiannaResponse> {
    try {
      const aiContext = {
        teamId: context.teamId,
        traceId: uuid(),
        leadId: context.leadId,
        channel: "sms" as const,
      };

      const result = await this.aiOrchestrator.generateSmsResponse(aiContext, {
        incomingMessage,
        conversationHistory: [],
        leadName: context.firstName || "there",
        intent: classification.intent,
      });

      return {
        message: result.response,
        confidence: 70,
        intent: classification.intent,
        requiresHumanReview: true, // AI responses always need review initially
        nextAction: this.determineNextAction(classification, context),
      };
    } catch (error) {
      this.logger.warn(`[GIANNA] AI fallback failed: ${error}`);

      // Ultimate fallback
      return {
        message: `Hey ${context.firstName || "there"}! Thanks for getting back. What questions do you have?`,
        confidence: 50,
        intent: classification.intent,
        requiresHumanReview: true,
        nextAction: { type: "wait" },
      };
    }
  }

  /**
   * Determine next action based on classification
   */
  private determineNextAction(
    classification: ClassificationResult,
    context: GiannaContext,
  ): GiannaResponse["nextAction"] {
    switch (classification.intent) {
      case "interested":
      case "wants_call":
        return {
          type: "schedule_call",
          metadata: { priority: "high" },
        };

      case "soft_no":
        return {
          type: "follow_up",
          delayMinutes: 90 * 24 * 60, // 90 days
        };

      case "hard_no":
        return { type: "wait" };

      case "opt_out":
      case "anger":
        return { type: "add_to_dnc" };

      default:
        // Ghost follow-up timing
        const ghostDelays: Record<number, number> = {
          1: 3 * 24 * 60, // Day 3
          2: 7 * 24 * 60, // Day 7
          3: 14 * 24 * 60, // Day 14
          4: 30 * 24 * 60, // Day 30
        };
        return {
          type: "follow_up",
          delayMinutes: ghostDelays[context.messageNumber] || 30 * 24 * 60,
        };
    }
  }

  /**
   * Apply template variables
   */
  private applyTemplate(template: string, context: GiannaContext): string {
    return template
      .replace(/\{firstName\}/g, context.firstName || "there")
      .replace(/\{lastName\}/g, context.lastName || "")
      .replace(/\{companyName\}/g, context.companyName || "your business")
      .replace(/\{industry\}/g, context.industry || "your industry")
      .replace(
        /\{propertyAddress\}/g,
        context.propertyAddress || "your property",
      )
      .replace(/\{phone\}/g, context.phone || "");
  }

  /**
   * Send SMS via SignalHouse (queued)
   */
  async sendSms(
    teamId: string,
    leadId: string,
    message: string,
    toPhone: string,
    fromPhone: string,
    campaignId?: string,
  ): Promise<{ jobId: string }> {
    const job = await this.giannaQueue.add("send-sms", {
      teamId,
      leadId,
      message,
      toPhone,
      fromPhone,
      campaignId,
      agent: "gianna",
      timestamp: new Date().toISOString(),
    });

    return { jobId: job.id || "" };
  }

  /**
   * Log message to database
   */
  async logMessage(
    teamId: string,
    leadId: string,
    message: string,
    direction: "inbound" | "outbound",
    fromAddress: string,
    toAddress: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.db.insert(messagesTable).values({
      teamId,
      leadId,
      type: MessageType.SMS,
      direction:
        direction === "inbound"
          ? MessageDirection.INBOUND
          : MessageDirection.OUTBOUND,
      body: message,
      fromAddress,
      toAddress,
      status: "ACTIVE",
      metadata: {
        ...metadata,
        agent: "gianna",
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Get lead context for conversation
   */
  async getLeadContext(
    teamId: string,
    leadId: string,
  ): Promise<GiannaContext | null> {
    const lead = await this.db.query.leads.findFirst({
      where: and(eq(leadsTable.id, leadId), eq(leadsTable.teamId, teamId)),
    });

    if (!lead) return null;

    // Count messages to determine conversation stage
    const messageCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messagesTable)
      .where(eq(messagesTable.leadId, leadId))
      .then((rows) => Number(rows[0]?.count || 0));

    return {
      teamId,
      leadId,
      firstName: lead.firstName || undefined,
      lastName: lead.lastName || undefined,
      companyName: lead.company || undefined,
      industry: undefined, // Would come from lead metadata
      propertyAddress: lead.address || undefined,
      phone: lead.phone || "",
      email: lead.email || undefined,
      messageNumber: messageCount,
    };
  }
}
