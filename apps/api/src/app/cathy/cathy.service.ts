import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and, desc } from "drizzle-orm";
import { leadsTable, messagesTable } from "@/database/schema-alias";
import { AiOrchestratorService } from "../ai-orchestrator/ai-orchestrator.service";
import { v4 as uuid } from "uuid";
import { MessageDirection } from "@nextier/common";

/**
 * CATHY SERVICE - Nurture Agent with Personality
 *
 * CATHY handles leads that need continued engagement:
 * - Follow-up after initial contact
 * - Relationship building
 * - Light humor to keep engagement warm
 * - Re-engagement of cold leads
 *
 * CATHY escalates to SABRINA when scheduling intent is detected.
 */

// =============================================================================
// TYPES
// =============================================================================

export type NurtureStage =
  | "initial_followup"
  | "value_building"
  | "objection_handling"
  | "re_engagement"
  | "final_attempt";

export interface CathyContext {
  leadId: string;
  teamId: string;
  leadName?: string;
  company?: string;
  industry?: string;
  lastMessageDaysAgo: number;
  totalMessages: number;
  lastResponse?: string;
  nurtureStage: NurtureStage;
}

export interface CathyResponse {
  message: string;
  tone: "friendly" | "professional" | "humorous" | "urgent";
  stage: NurtureStage;
  shouldEscalate: boolean;
  escalateReason?: string;
  confidence: number;
  suggestedFollowupDays: number;
}

// =============================================================================
// NURTURE TEMPLATES
// =============================================================================

const NURTURE_TEMPLATES: Record<NurtureStage, string[]> = {
  initial_followup: [
    "Hey {firstName}! Just circling back - did you get a chance to think about what we discussed?",
    "Hi {firstName}, hope your week is going well! Wanted to follow up on our last chat.",
    "Hey {firstName}! No pressure at all, just wanted to make sure my message didn't get lost in the shuffle.",
  ],
  value_building: [
    "Hi {firstName}! Quick thought - I was just helping another {industry} business with something similar. Reminded me of you!",
    "Hey {firstName}, saw something that made me think of {company}. Got a sec to chat about how other businesses in your space are handling this?",
    "{firstName} - just a quick note. Helped a similar company save 10 hours/week on follow-ups. Thought you might find it interesting!",
  ],
  objection_handling: [
    "Totally get it, {firstName}. Timing isn't always right. Mind if I check back in a few weeks?",
    "No worries at all! Just wanted to make sure you knew I'm here if anything changes. When would be a better time to reconnect?",
    "I hear you, {firstName}. Just out of curiosity - what would need to change for this to make sense for {company}?",
  ],
  re_engagement: [
    "Hey {firstName}! It's been a minute - hope all is well with {company}! Anything new on your end?",
    "Hi {firstName}! Checking in - things have probably changed since we last talked. Open to a quick catch-up?",
    "{firstName} - just a friendly ping! Wanted to see how {company} is doing these days.",
  ],
  final_attempt: [
    "Hey {firstName}, I know you're busy so I'll keep this brief - I'll stop reaching out, but if things change, I'm always here to help!",
    "{firstName} - I don't want to be a pest! Let me know if you'd ever like to reconnect, otherwise I'll leave you be.",
    "Last one from me, {firstName}! If the timing is ever right, you know where to find me. Best of luck with everything at {company}!",
  ],
};

const HUMOR_ADDITIONS = [
  " (Promise I'm not a robot, just persistent!)",
  " (My coffee hasn't kicked in yet, so apologies if this is too early!)",
  " (Yes, I really do enjoy follow-ups - weird, I know!)",
  "",
  "",
  "", // Empty strings for variety
];

// =============================================================================
// SERVICE
// =============================================================================

@Injectable()
export class CathyService {
  private readonly logger = new Logger(CathyService.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    private aiOrchestrator: AiOrchestratorService,
  ) {}

  /**
   * Generate a nurture message for a lead
   */
  async generateNurtureMessage(
    teamId: string,
    leadId: string,
  ): Promise<CathyResponse> {
    const context = await this.getLeadContext(teamId, leadId);

    // Check if we should escalate to SABRINA
    if (context.lastResponse) {
      const shouldEscalate = this.detectSchedulingIntent(context.lastResponse);
      if (shouldEscalate) {
        return {
          message: "",
          tone: "professional",
          stage: context.nurtureStage,
          shouldEscalate: true,
          escalateReason: "Scheduling intent detected - hand off to SABRINA",
          confidence: 0.9,
          suggestedFollowupDays: 0,
        };
      }
    }

    // Generate template-based message
    const message = this.generateFromTemplate(context);
    const tone = this.determineTone(context);

    return {
      message,
      tone,
      stage: context.nurtureStage,
      shouldEscalate: false,
      confidence: 0.85,
      suggestedFollowupDays: this.getSuggestedFollowupDays(context.nurtureStage),
    };
  }

  /**
   * Process an incoming response from a lead being nurtured
   */
  async processResponse(
    teamId: string,
    leadId: string,
    message: string,
  ): Promise<{
    classification: "positive" | "negative" | "neutral" | "scheduling";
    suggestedResponse: string;
    shouldEscalate: boolean;
    escalateTo?: "sabrina" | "human";
  }> {
    const lowerMessage = message.toLowerCase();

    // Check for scheduling intent -> SABRINA
    if (this.detectSchedulingIntent(message)) {
      return {
        classification: "scheduling",
        suggestedResponse: "",
        shouldEscalate: true,
        escalateTo: "sabrina",
      };
    }

    // Check for opt-out -> stop nurturing
    if (this.detectOptOut(lowerMessage)) {
      return {
        classification: "negative",
        suggestedResponse: "No problem at all! I'll remove you from my list. Best of luck!",
        shouldEscalate: false,
      };
    }

    // Check for positive response
    if (this.detectPositiveResponse(lowerMessage)) {
      // Use AI to generate a contextual response
      try {
        const aiContext = {
          teamId,
          traceId: uuid(),
          leadId,
          channel: "sms" as const,
        };

        const aiResponse = await this.aiOrchestrator.generateSmsResponse(
          aiContext,
          {
            incomingMessage: message,
            conversationHistory: [],
            leadName: "",
            intent: "nurture_positive_response",
          },
        );

        return {
          classification: "positive",
          suggestedResponse: aiResponse.response,
          shouldEscalate: aiResponse.shouldEscalate,
          escalateTo: aiResponse.shouldEscalate ? "human" : undefined,
        };
      } catch {
        return {
          classification: "positive",
          suggestedResponse: "That's great to hear! What would be the best way to move forward?",
          shouldEscalate: false,
        };
      }
    }

    // Neutral/unclear - try to keep conversation going
    return {
      classification: "neutral",
      suggestedResponse: "Thanks for getting back to me! Is there anything specific I can help clarify?",
      shouldEscalate: false,
    };
  }

  /**
   * Determine which leads need nurturing today
   */
  async getLeadsToNurture(
    teamId: string,
    limit = 50,
  ): Promise<Array<{ leadId: string; daysSinceContact: number; stage: NurtureStage }>> {
    const results: Array<{ leadId: string; daysSinceContact: number; stage: NurtureStage }> = [];

    // Get leads in nurturing pipeline stages
    const leads = await this.db.query.leads.findMany({
      where: and(
        eq(leadsTable.teamId, teamId),
        // Could add pipeline status filter here
      ),
      limit: limit * 2, // Get extra to filter
    });

    for (const lead of leads) {
      // Get last message for this lead
      const lastMessage = await this.db.query.messages.findFirst({
        where: eq(messagesTable.leadId, lead.id),
        orderBy: [desc(messagesTable.createdAt)],
      });

      if (!lastMessage) continue;

      const daysSinceContact = Math.floor(
        (Date.now() - new Date(lastMessage.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      );

      // Nurture cadence: follow up every 3-7 days depending on stage
      const stage = this.determineNurtureStage(lead, daysSinceContact);
      const followupDays = this.getSuggestedFollowupDays(stage);

      if (daysSinceContact >= followupDays) {
        results.push({
          leadId: lead.id,
          daysSinceContact,
          stage,
        });
      }

      if (results.length >= limit) break;
    }

    return results;
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private async getLeadContext(teamId: string, leadId: string): Promise<CathyContext> {
    const lead = await this.db.query.leads.findFirst({
      where: and(
        eq(leadsTable.id, leadId),
        eq(leadsTable.teamId, teamId),
      ),
    });

    // Get message history
    const messages = await this.db.query.messages.findMany({
      where: eq(messagesTable.leadId, leadId),
      orderBy: [desc(messagesTable.createdAt)],
      limit: 10,
    });

    const lastInbound = messages.find((m) => m.direction === MessageDirection.INBOUND);
    const lastMessage = messages[0];
    const daysSinceContact = lastMessage
      ? Math.floor((Date.now() - new Date(lastMessage.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      leadId,
      teamId,
      leadName: lead?.firstName || lead?.lastName || undefined,
      company: lead?.company || undefined,
      industry: undefined, // Could be added to lead schema
      lastMessageDaysAgo: daysSinceContact,
      totalMessages: messages.length,
      lastResponse: lastInbound?.body || undefined,
      nurtureStage: this.determineNurtureStage(lead, daysSinceContact),
    };
  }

  private determineNurtureStage(lead: any, daysSinceContact: number): NurtureStage {
    // Logic to determine where in nurture sequence this lead is
    const totalTouches = lead?.touchCount || 0;

    if (totalTouches <= 2) return "initial_followup";
    if (totalTouches <= 4) return "value_building";
    if (totalTouches <= 6) return "objection_handling";
    if (totalTouches <= 8) return "re_engagement";
    return "final_attempt";
  }

  private generateFromTemplate(context: CathyContext): string {
    const templates = NURTURE_TEMPLATES[context.nurtureStage];
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Replace placeholders
    let message = template
      .replace(/{firstName}/g, context.leadName || "there")
      .replace(/{company}/g, context.company || "your business")
      .replace(/{industry}/g, context.industry || "your industry");

    // Maybe add humor (30% chance)
    if (Math.random() < 0.3) {
      const humor = HUMOR_ADDITIONS[Math.floor(Math.random() * HUMOR_ADDITIONS.length)];
      message += humor;
    }

    return message;
  }

  private determineTone(context: CathyContext): "friendly" | "professional" | "humorous" | "urgent" {
    if (context.nurtureStage === "final_attempt") return "professional";
    if (context.lastMessageDaysAgo > 14) return "friendly";
    if (Math.random() < 0.2) return "humorous";
    return "friendly";
  }

  private getSuggestedFollowupDays(stage: NurtureStage): number {
    const followupMap: Record<NurtureStage, number> = {
      initial_followup: 2,
      value_building: 4,
      objection_handling: 5,
      re_engagement: 7,
      final_attempt: 14,
    };
    return followupMap[stage];
  }

  private detectSchedulingIntent(message: string): boolean {
    const schedulingPatterns = [
      /\b(schedule|book|calendar|meet|call me|let'?s talk|available|appointment|time to chat)\b/i,
      /\b(when can|what time|tomorrow|next week|this week|monday|tuesday|wednesday|thursday|friday)\b/i,
      /\b(free|open|slot|set up)\b/i,
    ];
    return schedulingPatterns.some((pattern) => pattern.test(message));
  }

  private detectOptOut(message: string): boolean {
    const optOutPatterns = [
      /\b(stop|unsubscribe|remove|opt out|do not contact|leave me alone|not interested)\b/i,
      /\b(take me off|quit texting|stop messaging)\b/i,
    ];
    return optOutPatterns.some((pattern) => pattern.test(message));
  }

  private detectPositiveResponse(message: string): boolean {
    const positivePatterns = [
      /\b(yes|yeah|sure|ok|okay|sounds good|interested|tell me more|let'?s do it)\b/i,
      /\b(that works|great|perfect|absolutely|definitely)\b/i,
    ];
    return positivePatterns.some((pattern) => pattern.test(message));
  }
}
