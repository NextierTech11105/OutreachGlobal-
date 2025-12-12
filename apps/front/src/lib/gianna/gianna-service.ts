/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GIANNA AI SERVICE - UNIFIED INTELLIGENCE ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This service integrates all Gianna knowledge bases:
 * - Personality DNA (8 archetypes)
 * - Conversation Flows (15+ flows)
 * - Message Library (160+ templates)
 * - Automation Flows (email capture, calendar, voicemail)
 * - Objection Handling
 * - Intent Classification
 */

import {
  GIANNA_IDENTITY,
  GIANNA_PRESETS,
  RESPONSE_STRATEGIES,
  OBJECTION_RESPONSES,
  LEAD_TYPE_APPROACHES,
  MESSAGE_RULES,
  personalityToPrompt,
  detectObjection,
  type GiannaPersonality,
} from "./knowledge-base";

import {
  PERSONALITY_ARCHETYPES,
  GREETING_DNA,
  CLOSING_DNA,
  HUMOR_DNA,
  PSYCHOLOGY_DNA,
  getOptimalPersonality,
  generateMessageWithDNA,
  type PersonalityArchetype,
  type ConversationContext,
  type GeneratedMessageDNA,
} from "./personality-dna";

import {
  classifyResponse,
  CONVERSATION_FLOWS,
  INDUSTRY_OPENERS,
  getFlowForResponse,
  getIndustryOpener,
  type ResponseClassification,
  type ConversationFlow,
} from "./conversation-flows";

import {
  OPENER_LIBRARY,
  REBUTTAL_LIBRARY,
  getBestOpeners,
  CAPTURE_GOALS,
} from "./knowledge-base/message-library";
import {
  AUTOMATION_FLOWS,
  CALENDAR_CONFIG,
  EMAIL_QUEUE_CONFIG,
  processEmailCapture,
  LESLIE_NIELSEN_HUMOR,
} from "./knowledge-base/automation-flows";
import {
  GIANNA_PERSONALITY,
  getGiannaPrompt,
  GIANNA_TEMPLATES,
} from "./knowledge-base/personality";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GiannaContext {
  // Lead info
  firstName?: string;
  lastName?: string;
  companyName?: string;
  industry?: string;
  propertyAddress?: string;
  phone?: string;
  email?: string;

  // Conversation state
  channel: "sms" | "voice" | "email" | "chat";
  stage:
    | "cold_open"
    | "warming_up"
    | "digging_in"
    | "pitching"
    | "handling_pushback"
    | "going_for_close"
    | "follow_up"
    | "re_engagement"
    | "hot_response"
    | "cool_down";
  messageNumber: number;
  daysSinceLastContact?: number;

  // Previous interactions
  lastResponseTone?:
    | "positive"
    | "neutral"
    | "negative"
    | "question"
    | "objection";
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;

  // Lead type for real estate
  leadType?:
    | "pre_foreclosure"
    | "foreclosure"
    | "absentee_owner"
    | "vacant"
    | "tax_lien"
    | "inherited"
    | "high_equity"
    | "tired_landlord"
    | "divorce";
  distressLevel?: number; // 0-100

  // Preferences
  preferredPersonality?: PersonalityArchetype;
  humorLevel?: number; // 0-10 override
  aggressionLevel?: number; // 0-10
  urgencyLevel?: number; // 0-10

  // Team/campaign context
  teamId?: string;
  campaignId?: string;
  agentName?: string; // "Gianna" by default
}

export interface GiannaResponse {
  message: string;
  personality: PersonalityArchetype;
  confidence: number;
  intent?: string;
  suggestedFlow?: string;
  requiresHumanReview?: boolean;
  automationTrigger?: string;
  nextAction?: {
    type:
      | "wait"
      | "follow_up"
      | "schedule_call"
      | "send_email"
      | "add_to_dnc"
      | "escalate";
    delayMinutes?: number;
    metadata?: Record<string, unknown>;
  };
  alternatives?: string[];
  debugInfo?: Record<string, unknown>;
}

export interface GiannaOpenerRequest {
  context: GiannaContext;
  category?: "property" | "business" | "general" | "ny_direct";
  count?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class GiannaService {
  private static instance: GiannaService;

  private constructor() {}

  static getInstance(): GiannaService {
    if (!GiannaService.instance) {
      GiannaService.instance = new GiannaService();
    }
    return GiannaService.instance;
  }

  // ═════════════════════════════════════════════════
  // CORE METHODS
  // ═════════════════════════════════════════════════

  /**
   * Generate a response to an incoming message
   */
  async generateResponse(
    incomingMessage: string,
    context: GiannaContext,
  ): Promise<GiannaResponse> {
    // Step 1: Classify the incoming message
    const classification = classifyResponse(incomingMessage);
    console.log("[Gianna] Intent classification:", classification);

    // Step 2: Check for opt-out (immediate compliance)
    if (classification.intent === "opt_out") {
      return {
        message: "You've been removed from our list. Take care!",
        personality: "empathetic_advisor",
        confidence: 100,
        intent: "opt_out",
        requiresHumanReview: false,
        nextAction: {
          type: "add_to_dnc",
          metadata: { phone: context.phone },
        },
      };
    }

    // Step 3: Check for anger/de-escalation needed
    if (classification.intent === "anger") {
      return {
        message:
          "I apologize for any inconvenience. I'll remove you from our list right now. Take care!",
        personality: "empathetic_advisor",
        confidence: 100,
        intent: "anger",
        requiresHumanReview: false,
        nextAction: { type: "add_to_dnc" },
      };
    }

    // Step 4: Get appropriate flow
    const flow = getFlowForResponse(classification);

    // Step 5: Determine personality
    const personalityId =
      context.preferredPersonality ||
      this.selectPersonality(context, classification);
    const personality = PERSONALITY_ARCHETYPES[personalityId];

    // Step 6: Check for objection
    const objectionType = detectObjection(incomingMessage);
    if (objectionType) {
      return this.handleObjection(
        objectionType,
        context,
        classification,
        personalityId,
      );
    }

    // Step 7: Generate response using DNA system
    const dnaContext: ConversationContext = {
      firstName: context.firstName || "there",
      companyName: context.companyName,
      industry: context.industry,
      leadType: context.leadType,
      distressLevel: context.distressLevel,
      stage: context.stage as any,
      messageNumber: context.messageNumber,
      daysSinceLastContact: context.daysSinceLastContact,
      lastResponseTone: context.lastResponseTone,
      preferredPersonality: personalityId,
      humorLevel: context.humorLevel ? context.humorLevel * 10 : undefined,
    };

    const generatedMessage = generateMessageWithDNA(dnaContext);

    // Step 8: Apply flow-specific adjustments
    let finalMessage = generatedMessage.message;
    if (flow && flow.steps.length > 0) {
      const flowStep = flow.steps[0];
      finalMessage = this.applyFlowTemplate(flowStep.message, context);
    }

    // Step 9: Ensure message fits SMS length (if SMS channel)
    if (context.channel === "sms") {
      finalMessage = this.truncateForSMS(finalMessage);
    }

    // Step 10: Check if human review needed
    const requiresHumanReview = this.shouldRequireHumanReview(
      context,
      classification,
    );

    return {
      message: finalMessage,
      personality: personalityId,
      confidence: classification.confidence * 100,
      intent: classification.intent,
      suggestedFlow: flow?.id,
      requiresHumanReview,
      alternatives: generatedMessage.alternativeVersions,
      nextAction: this.determineNextAction(classification, context),
      debugInfo: {
        classification,
        personalityUsed: personality.name,
        humorUsed: generatedMessage.humorUsed,
        psychologyTriggers: generatedMessage.psychologyTriggers,
      },
    };
  }

  /**
   * Generate opener messages for outreach
   */
  generateOpeners(request: GiannaOpenerRequest): string[] {
    const { context, category = "general", count = 5 } = request;

    // Get category-specific openers
    const categoryOpeners = OPENER_LIBRARY[category] || OPENER_LIBRARY.general;

    // Select openers based on context
    let selectedOpeners: string[];

    // Check if we have performance data (future: integrate with database)
    const performanceData: never[] = []; // Would come from DB

    if (performanceData.length > 0) {
      selectedOpeners = getBestOpeners(category, performanceData, count);
    } else {
      // Random selection if no performance data
      selectedOpeners = categoryOpeners
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
    }

    // Apply context variables
    return selectedOpeners.map((opener) =>
      this.applyFlowTemplate(opener, context),
    );
  }

  /**
   * Generate industry-specific opener
   */
  generateIndustryOpener(industry: string, context: GiannaContext): string {
    return getIndustryOpener(industry, {
      first_name: context.firstName || "there",
      company_name: context.companyName || "your business",
    });
  }

  /**
   * Handle objection with appropriate response
   */
  private handleObjection(
    objectionType: string,
    context: GiannaContext,
    classification: ResponseClassification,
    personalityId: PersonalityArchetype,
  ): GiannaResponse {
    const objectionConfig =
      OBJECTION_RESPONSES[objectionType as keyof typeof OBJECTION_RESPONSES];

    if (!objectionConfig) {
      return {
        message: "I understand. Let me know if anything changes.",
        personality: personalityId,
        confidence: 60,
        intent: "objection_unknown",
        requiresHumanReview: true,
      };
    }

    // Select random response from objection handler
    const responses = objectionConfig.responses;
    const selectedResponse =
      responses[Math.floor(Math.random() * responses.length)];

    // Apply context
    const finalMessage = this.applyFlowTemplate(selectedResponse, context);

    // Check if this is a rebuttal that needs human review
    const rebuttalConfig =
      REBUTTAL_LIBRARY[objectionType as keyof typeof REBUTTAL_LIBRARY];
    const requiresHumanReview =
      rebuttalConfig?.human_in_loop && context.messageNumber <= 3;

    return {
      message: finalMessage,
      personality: personalityId,
      confidence: 75,
      intent: `objection_${objectionType}`,
      requiresHumanReview,
      nextAction:
        objectionType === "not_interested" && context.messageNumber >= 3
          ? { type: "follow_up", delayMinutes: 90 * 24 * 60 } // 90 days
          : undefined,
    };
  }

  /**
   * Select appropriate personality based on context
   */
  private selectPersonality(
    context: GiannaContext,
    classification: ResponseClassification,
  ): PersonalityArchetype {
    // Use classification's suggested personality if available
    if (classification.suggestedPersonality) {
      return classification.suggestedPersonality;
    }

    // Distressed situations → empathetic
    if (context.distressLevel && context.distressLevel > 70) {
      return "empathetic_advisor";
    }

    // High-value/professional → sharp professional
    if (
      context.industry &&
      ["healthcare", "legal", "finance", "consulting"].includes(
        context.industry.toLowerCase(),
      )
    ) {
      return "sharp_professional";
    }

    // Ghost revival → playful
    if (
      context.stage === "re_engagement" ||
      (context.daysSinceLastContact && context.daysSinceLastContact > 7)
    ) {
      return context.messageNumber > 3 ? "playful_closer" : "brooklyn_bestie";
    }

    // Hot response → hustler
    if (
      classification.intent === "interested" ||
      classification.sentiment === "positive"
    ) {
      return "hustler_heart";
    }

    // Default
    return "brooklyn_bestie";
  }

  /**
   * Apply template variables
   */
  private applyFlowTemplate(template: string, context: GiannaContext): string {
    return template
      .replace(/\{firstName\}/g, context.firstName || "there")
      .replace(/\{\{first_name\}\}/g, context.firstName || "there")
      .replace(/\{lastName\}/g, context.lastName || "")
      .replace(/\{companyName\}/g, context.companyName || "your business")
      .replace(/\{\{company_name\}\}/g, context.companyName || "your business")
      .replace(/\{industry\}/g, context.industry || "your industry")
      .replace(/\{\{industry\}\}/g, context.industry || "your industry")
      .replace(/\{address\}/g, context.propertyAddress || "your property")
      .replace(
        /\{propertyAddress\}/g,
        context.propertyAddress || "your property",
      )
      .replace(
        /\{\{property_address\}\}/g,
        context.propertyAddress || "your property",
      )
      .replace(/\{calendarLink\}/g, CALENDAR_CONFIG.link)
      .replace(/\{\{calendar_link\}\}/g, CALENDAR_CONFIG.link)
      .replace(/\{agentName\}/g, context.agentName || GIANNA_IDENTITY.name);
  }

  /**
   * Truncate message to fit SMS character limits
   */
  private truncateForSMS(message: string): string {
    const maxLength = MESSAGE_RULES.sms.hardLimit;

    if (message.length <= maxLength) {
      return message;
    }

    // Find a good break point
    const truncated = message.slice(0, maxLength - 3);
    const lastPeriod = truncated.lastIndexOf(".");
    const lastQuestion = truncated.lastIndexOf("?");
    const lastExclaim = truncated.lastIndexOf("!");

    const breakPoint = Math.max(lastPeriod, lastQuestion, lastExclaim);

    if (breakPoint > maxLength * 0.7) {
      return message.slice(0, breakPoint + 1);
    }

    return truncated + "...";
  }

  /**
   * Check if human review is required
   */
  private shouldRequireHumanReview(
    context: GiannaContext,
    classification: ResponseClassification,
  ): boolean {
    // First 3 rebuttals need human review
    if (
      classification.intent?.startsWith("objection") &&
      context.messageNumber <= 3
    ) {
      return true;
    }

    // Low confidence responses need review
    if (classification.confidence < 0.6) {
      return true;
    }

    // Negative sentiment needs review
    if (
      classification.sentiment === "negative" &&
      classification.intent !== "opt_out"
    ) {
      return true;
    }

    return false;
  }

  /**
   * Determine next action based on classification
   */
  private determineNextAction(
    classification: ResponseClassification,
    context: GiannaContext,
  ): GiannaResponse["nextAction"] {
    switch (classification.intent) {
      case "interested":
      case "request_call":
        return {
          type: "schedule_call",
          metadata: { priority: "high" },
        };

      case "request_info":
        return {
          type: "send_email",
          metadata: { templateType: "info_packet" },
        };

      case "soft_no":
        return {
          type: "follow_up",
          delayMinutes: 90 * 24 * 60, // 90 days
        };

      case "hard_no":
        return {
          type: "wait",
          metadata: { reason: "prospect_declined" },
        };

      case "opt_out":
      case "anger":
        return {
          type: "add_to_dnc",
        };

      case "ghost":
        // Determine ghost follow-up based on message count
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

      default:
        return { type: "wait" };
    }
  }

  // ═════════════════════════════════════════════════
  // AUTOMATION TRIGGERS
  // ═════════════════════════════════════════════════

  /**
   * Check message for email and trigger automation
   */
  async checkEmailCaptureAutomation(
    message: string,
    context: GiannaContext,
  ): Promise<{ triggered: boolean; email?: string }> {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
    const match = message.match(emailRegex);

    if (match) {
      const email = match[0].toLowerCase();
      console.log("[Gianna] Email captured:", email);

      // Trigger email capture automation
      await processEmailCapture({
        email,
        phone: context.phone || "",
        firstName: context.firstName,
        propertyAddress: context.propertyAddress,
      });

      return { triggered: true, email };
    }

    return { triggered: false };
  }

  // ═════════════════════════════════════════════════
  // SYSTEM PROMPT GENERATION
  // ═════════════════════════════════════════════════

  /**
   * Generate system prompt for AI model
   */
  generateSystemPrompt(context: GiannaContext): string {
    const basePrompt = getGiannaPrompt({
      humor: context.humorLevel || 6,
      aggression: context.aggressionLevel || 6,
      urgency: context.urgencyLevel || 6,
      industry: context.industry,
    });

    // Add lead-type specific context
    let leadContext = "";
    if (context.leadType) {
      const leadApproach =
        LEAD_TYPE_APPROACHES[
          context.leadType as keyof typeof LEAD_TYPE_APPROACHES
        ];
      if (leadApproach) {
        leadContext = `\n\nLEAD TYPE: ${context.leadType.toUpperCase()}
Tone: ${leadApproach.tone}
Avoid: ${leadApproach.avoid}
Approach: ${leadApproach.approach}
Opening style: ${leadApproach.opener}`;
      }
    }

    // Add conversation stage context
    let stageContext = "";
    if (context.stage) {
      stageContext = `\n\nCONVERSATION STAGE: ${context.stage.toUpperCase()}
Message #: ${context.messageNumber}
${context.daysSinceLastContact ? `Days since last contact: ${context.daysSinceLastContact}` : ""}`;
    }

    return basePrompt + leadContext + stageContext;
  }

  // ═════════════════════════════════════════════════
  // TEMPLATES
  // ═════════════════════════════════════════════════

  /**
   * Get SMS template
   */
  getSMSTemplate(type: keyof typeof GIANNA_TEMPLATES.sms): string {
    return GIANNA_TEMPLATES.sms[type];
  }

  /**
   * Get email template
   */
  getEmailTemplate(
    type: keyof typeof GIANNA_TEMPLATES.email,
  ): string | string[] {
    return GIANNA_TEMPLATES.email[type];
  }

  /**
   * Get voicemail script
   */
  getVoicemailScript(type: keyof typeof GIANNA_TEMPLATES.voicemail): string {
    return GIANNA_TEMPLATES.voicemail[type];
  }

  // ═════════════════════════════════════════════════
  // HUMOR INJECTION
  // ═════════════════════════════════════════════════

  /**
   * Get Leslie Nielsen style humor
   */
  getLeslieNielsenHumor(context: string): string {
    const examples = LESLIE_NIELSEN_HUMOR.examples.filter((ex) =>
      ex.context.toLowerCase().includes(context.toLowerCase()),
    );

    if (examples.length > 0) {
      return examples[Math.floor(Math.random() * examples.length)].response;
    }

    // Fallback to random
    const all = LESLIE_NIELSEN_HUMOR.examples;
    return all[Math.floor(Math.random() * all.length)].response;
  }

  // ═════════════════════════════════════════════════
  // CAPTURE GOALS
  // ═════════════════════════════════════════════════

  /**
   * Get capture goal CTA
   */
  getCaptureGoalCTA(goal: keyof typeof CAPTURE_GOALS): string {
    return CAPTURE_GOALS[goal].cta;
  }

  /**
   * Get calendar link
   */
  getCalendarLink(): string {
    return CALENDAR_CONFIG.link;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const gianna = GiannaService.getInstance();

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Knowledge base
  GIANNA_IDENTITY,
  GIANNA_PRESETS,
  RESPONSE_STRATEGIES,
  OBJECTION_RESPONSES,
  LEAD_TYPE_APPROACHES,
  MESSAGE_RULES,
  personalityToPrompt,
  detectObjection,

  // Personality DNA
  PERSONALITY_ARCHETYPES,
  GREETING_DNA,
  CLOSING_DNA,
  HUMOR_DNA,
  PSYCHOLOGY_DNA,
  getOptimalPersonality,
  generateMessageWithDNA,

  // Conversation flows
  classifyResponse,
  CONVERSATION_FLOWS,
  INDUSTRY_OPENERS,
  getFlowForResponse,
  getIndustryOpener,

  // Message library
  OPENER_LIBRARY,
  REBUTTAL_LIBRARY,
  getBestOpeners,
  CAPTURE_GOALS,

  // Automation
  AUTOMATION_FLOWS,
  CALENDAR_CONFIG,
  EMAIL_QUEUE_CONFIG,
  processEmailCapture,
  LESLIE_NIELSEN_HUMOR,

  // Personality
  GIANNA_PERSONALITY,
  getGiannaPrompt,
  GIANNA_TEMPLATES,
};

export default gianna;
