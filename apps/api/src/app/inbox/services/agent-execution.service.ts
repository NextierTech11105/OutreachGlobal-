import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and } from "drizzle-orm";
import {
  inboxItemsTable,
  leadsTable,
  campaignsTable,
  aiSdrAvatarsTable,
  initialMessagesTable,
  campaignInitialMessagesTable,
  sdrCampaignConfigsTable,
  bucketMovementsTable,
  suppressionListTable,
} from "@/database/schema-alias";
import {
  ResponseClassification,
  InboxPriority,
  BucketType,
  SuppressionType,
} from "@nextier/common";
import { AiSdrAvatarSelect } from "@/app/sdr/models/ai-sdr-avatar.model";

/**
 * Generic agent assignment - works with any AI SDR Avatar
 */
export interface AgentAssignment {
  agentId: string;
  agentName: string;
  agentPersonality: string;
  agentMission: string;
  agentGoal: string;
  agentRoles: string[];
  agentFaqs: Array<{ question: string; answer: string }>;
  campaignId: string;
  campaignName: string;
  initialMessageId: string;
  initialMessageContent: string;
  responseDelay: number;
}

export interface InboxTriggerResult {
  inboxItemId: string;
  classification: ResponseClassification;
  priority: InboxPriority;
  assignment?: AgentAssignment;
  autoRespond: boolean;
  suggestedResponse?: string;
}

export interface PrioritizationInput {
  classification: ResponseClassification;
  classificationConfidence: number;
  sentiment: string;
  intent: string;
  messageAge: number;
  leadScore?: number;
  hasActiveSDR: boolean;
}

export interface ClassificationResult {
  type: ResponseClassification;
  confidence: number;
  sentiment: string;
  intent: string;
}

/**
 * Generic Agent Execution Service
 *
 * This service handles AI SDR agent operations for ANY configured agent,
 * not just a specific hardcoded one. Agents are dynamically loaded from
 * the database and their personality/configuration is used for responses.
 *
 * Usage:
 * - Call `processIncomingResponse` when a lead responds to a campaign
 * - Call `assignAgent` to assign any active agent to handle a conversation
 * - Call `generateResponse` to create a personalized response using the agent's personality
 */
@Injectable()
export class AgentExecutionService {
  private readonly logger = new Logger(AgentExecutionService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Calculate priority score for inbox item
   */
  calculatePriorityScore(input: PrioritizationInput): {
    score: number;
    priority: InboxPriority;
  } {
    let score = 50;

    // Classification boosts
    const classificationBoosts: Record<string, number> = {
      [ResponseClassification.POSITIVE]: 30,
      [ResponseClassification.NEUTRAL]: 10,
      [ResponseClassification.DNC_REQUEST]: 20,
      [ResponseClassification.WRONG_NUMBER]: -10,
      [ResponseClassification.PROFANITY]: 5,
    };
    score += classificationBoosts[input.classification] || 0;

    // Sentiment boosts
    if (input.sentiment === "positive") score += 15;
    if (input.sentiment === "negative") score -= 10;

    // Intent boosts
    const intentBoosts: Record<string, number> = {
      interested: 25,
      question: 15,
      complaint: 10,
      not_interested: -15,
    };
    score += intentBoosts[input.intent] || 0;

    // Confidence penalty - low confidence items need human review
    if (input.classificationConfidence < 70) {
      score += 10;
    }

    // Time urgency
    if (input.messageAge < 5) score += 10;
    else if (input.messageAge < 30) score += 5;
    else if (input.messageAge > 60) score -= 5;

    // Lead score boost
    if (input.leadScore) {
      score += Math.floor(input.leadScore / 10);
    }

    // Active SDR boost
    if (input.hasActiveSDR) score += 5;

    // Clamp score
    score = Math.min(100, Math.max(0, score));

    // Determine priority level
    let priority: InboxPriority;
    if (score >= 85) priority = InboxPriority.URGENT;
    else if (score >= 70) priority = InboxPriority.HOT;
    else if (score >= 40) priority = InboxPriority.WARM;
    else priority = InboxPriority.COLD;

    return { score, priority };
  }

  /**
   * Process incoming response and trigger agent assignment
   * Works with any configured AI SDR agent
   */
  async processIncomingResponse(
    teamId: string,
    messageId: string,
    responseText: string,
    fromPhone: string,
    campaignId?: string,
  ): Promise<InboxTriggerResult> {
    // 1. Classify the response
    const classification = await this.classifyResponse(responseText);

    // 2. Get lead info
    const lead = await this.db.query.leads.findFirst({
      where: eq(leadsTable.phone, fromPhone),
    });

    // 3. Calculate priority
    const { score, priority } = this.calculatePriorityScore({
      classification: classification.type,
      classificationConfidence: classification.confidence,
      sentiment: classification.sentiment,
      intent: classification.intent,
      messageAge: 0,
      leadScore: lead?.score,
      hasActiveSDR: !!campaignId,
    });

    // 4. Create inbox item
    const [inboxItem] = await this.db
      .insert(inboxItemsTable)
      .values({
        teamId,
        messageId,
        leadId: lead?.id,
        campaignId,
        classification: classification.type,
        classificationConfidence: classification.confidence,
        priority,
        priorityScore: score,
        responseText,
        phoneNumber: fromPhone,
        sentiment: classification.sentiment,
        intent: classification.intent,
        requiresReview: classification.confidence < 80,
        currentBucket: this.getBucketForClassification(classification.type),
      })
      .returning();

    // 5. Get agent assignment if positive response
    let assignment: AgentAssignment | undefined;
    let autoRespond = false;
    let suggestedResponse: string | undefined;

    if (classification.type === ResponseClassification.POSITIVE && campaignId) {
      assignment = await this.assignAgent(teamId, campaignId, inboxItem.id);

      if (assignment) {
        const agentConfig = await this.getAgentConfig(
          assignment.agentId,
          campaignId,
        );
        autoRespond = agentConfig?.autoRespondToPositive ?? false;

        if (autoRespond) {
          suggestedResponse = await this.generateResponse(
            assignment,
            responseText,
            lead?.firstName,
          );
        }

        await this.db
          .update(inboxItemsTable)
          .set({ assignedSdrId: assignment.agentId })
          .where(eq(inboxItemsTable.id, inboxItem.id));
      }
    }

    this.logger.log(
      `Processed response: ${classification.type} (${classification.confidence}%) -> ${priority} (score: ${score})`,
    );

    return {
      inboxItemId: inboxItem.id,
      classification: classification.type,
      priority,
      assignment,
      autoRespond,
      suggestedResponse,
    };
  }

  /**
   * Assign an AI SDR agent to handle the response
   * Dynamically loads the agent from the campaign configuration
   */
  async assignAgent(
    teamId: string,
    campaignId: string,
    inboxItemId: string,
  ): Promise<AgentAssignment | undefined> {
    // 1. Get campaign with SDR
    const campaign = await this.db.query.campaigns.findFirst({
      where: eq(campaignsTable.id, campaignId),
    });

    if (!campaign?.sdrId) {
      this.logger.warn(`No SDR assigned to campaign ${campaignId}`);
      return undefined;
    }

    // 2. Get SDR details - works with ANY agent
    const agent = await this.db.query.aiSdrAvatars.findFirst({
      where: and(
        eq(aiSdrAvatarsTable.id, campaign.sdrId),
        eq(aiSdrAvatarsTable.active, true),
      ),
    });

    if (!agent) {
      this.logger.warn(`Agent ${campaign.sdrId} not found or inactive`);
      return undefined;
    }

    // 3. Get initial message for this campaign
    const campaignMessage =
      await this.db.query.campaignInitialMessages.findFirst({
        where: and(
          eq(campaignInitialMessagesTable.campaignId, campaignId),
          eq(campaignInitialMessagesTable.isActive, true),
        ),
      });

    if (!campaignMessage) {
      this.logger.warn(
        `No initial message configured for campaign ${campaignId}`,
      );
      return undefined;
    }

    // 4. Get initial message content
    const initialMessage = await this.db.query.initialMessages.findFirst({
      where: eq(initialMessagesTable.id, campaignMessage.initialMessageId),
    });

    if (!initialMessage) {
      return undefined;
    }

    // 5. Get agent config for response timing
    const agentConfig = await this.getAgentConfig(agent.id, campaignId);

    const minDelay = agentConfig?.minResponseDelaySeconds ?? 30;
    const maxDelay = agentConfig?.maxResponseDelaySeconds ?? 300;
    const responseDelay =
      Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;

    this.logger.log(
      `Assigned agent "${agent.name}" to inbox item ${inboxItemId}, response in ${responseDelay}s`,
    );

    return {
      agentId: agent.id,
      agentName: agent.name,
      agentPersonality: agent.personality,
      agentMission: agent.mission,
      agentGoal: agent.goal,
      agentRoles: agent.roles || [],
      agentFaqs: (agent.faqs as Array<{ question: string; answer: string }>) || [],
      campaignId,
      campaignName: campaign.name,
      initialMessageId: initialMessage.id,
      initialMessageContent: initialMessage.content,
      responseDelay,
    };
  }

  /**
   * Assign a specific agent by ID
   * Use this when you want to explicitly assign a particular agent
   */
  async assignAgentById(
    agentId: string,
    campaignId: string,
    inboxItemId: string,
  ): Promise<AgentAssignment | undefined> {
    // Get the agent directly
    const agent = await this.db.query.aiSdrAvatars.findFirst({
      where: and(
        eq(aiSdrAvatarsTable.id, agentId),
        eq(aiSdrAvatarsTable.active, true),
      ),
    });

    if (!agent) {
      this.logger.warn(`Agent ${agentId} not found or inactive`);
      return undefined;
    }

    // Get campaign
    const campaign = await this.db.query.campaigns.findFirst({
      where: eq(campaignsTable.id, campaignId),
    });

    if (!campaign) {
      this.logger.warn(`Campaign ${campaignId} not found`);
      return undefined;
    }

    // Get initial message
    const campaignMessage =
      await this.db.query.campaignInitialMessages.findFirst({
        where: and(
          eq(campaignInitialMessagesTable.campaignId, campaignId),
          eq(campaignInitialMessagesTable.isActive, true),
        ),
      });

    const initialMessage = campaignMessage
      ? await this.db.query.initialMessages.findFirst({
          where: eq(initialMessagesTable.id, campaignMessage.initialMessageId),
        })
      : undefined;

    // Get agent config
    const agentConfig = await this.getAgentConfig(agent.id, campaignId);
    const minDelay = agentConfig?.minResponseDelaySeconds ?? 30;
    const maxDelay = agentConfig?.maxResponseDelaySeconds ?? 300;
    const responseDelay =
      Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;

    return {
      agentId: agent.id,
      agentName: agent.name,
      agentPersonality: agent.personality,
      agentMission: agent.mission,
      agentGoal: agent.goal,
      agentRoles: agent.roles || [],
      agentFaqs: (agent.faqs as Array<{ question: string; answer: string }>) || [],
      campaignId,
      campaignName: campaign.name,
      initialMessageId: initialMessage?.id || "",
      initialMessageContent: initialMessage?.content || "",
      responseDelay,
    };
  }

  /**
   * Get agent campaign configuration
   */
  async getAgentConfig(agentId: string, campaignId: string) {
    return this.db.query.sdrCampaignConfigs.findFirst({
      where: and(
        eq(sdrCampaignConfigsTable.sdrId, agentId),
        eq(sdrCampaignConfigsTable.campaignId, campaignId),
      ),
    });
  }

  /**
   * Generate AI response using the agent's personality
   *
   * This method uses the agent's configured personality, mission, and goal
   * to create contextually appropriate responses.
   *
   * TODO: Integrate with LLM (OpenAI/Anthropic) for dynamic generation
   */
  async generateResponse(
    assignment: AgentAssignment,
    incomingMessage: string,
    leadFirstName?: string | null,
  ): Promise<string> {
    const greeting = leadFirstName ? `Hi ${leadFirstName}!` : "Hi there!";

    // Build context from agent personality
    const personalityContext = this.buildPersonalityContext(assignment);

    // Check if we have a relevant FAQ answer
    const faqAnswer = this.findRelevantFaq(incomingMessage, assignment.agentFaqs);
    if (faqAnswer) {
      return `${greeting} ${faqAnswer}`;
    }

    // Generate response based on personality
    // This is a simplified template - in production, this would call an LLM
    const response = this.generatePersonalityBasedResponse(
      assignment,
      incomingMessage,
      greeting,
    );

    return response;
  }

  /**
   * Build personality context for LLM prompts
   */
  private buildPersonalityContext(assignment: AgentAssignment): string {
    const parts = [
      `You are ${assignment.agentName}, an AI SDR assistant.`,
      `Personality: ${assignment.agentPersonality}`,
      `Mission: ${assignment.agentMission}`,
      `Goal: ${assignment.agentGoal}`,
    ];

    if (assignment.agentRoles.length > 0) {
      parts.push(`Your roles include: ${assignment.agentRoles.join(", ")}`);
    }

    return parts.join("\n");
  }

  /**
   * Find a relevant FAQ answer based on the incoming message
   */
  private findRelevantFaq(
    message: string,
    faqs: Array<{ question: string; answer: string }>,
  ): string | null {
    const lowerMessage = message.toLowerCase();

    for (const faq of faqs) {
      // Simple keyword matching - in production, use embeddings/semantic search
      const keywords = faq.question.toLowerCase().split(" ");
      const matchCount = keywords.filter(
        (word) => word.length > 3 && lowerMessage.includes(word),
      ).length;

      if (matchCount >= 2) {
        return faq.answer;
      }
    }

    return null;
  }

  /**
   * Generate a response based on agent personality
   * This is a template-based approach - replace with LLM in production
   */
  private generatePersonalityBasedResponse(
    assignment: AgentAssignment,
    incomingMessage: string,
    greeting: string,
  ): string {
    const lowerMessage = incomingMessage.toLowerCase();

    // Detect common intents and respond accordingly
    if (
      lowerMessage.includes("cost") ||
      lowerMessage.includes("price") ||
      lowerMessage.includes("charge")
    ) {
      return `${greeting} Great question about pricing! ${assignment.agentMission} I'd love to discuss your specific situation. What questions do you have?`;
    }

    if (
      lowerMessage.includes("how") ||
      lowerMessage.includes("what") ||
      lowerMessage.includes("?")
    ) {
      return `${greeting} That's a great question! ${assignment.agentGoal} Would you like me to explain more about how I can help?`;
    }

    // Default response using personality
    return `${greeting} Thanks for getting back to me! ${assignment.agentGoal} What questions do you have?`;
  }

  /**
   * Classify response using rule-based classification
   * TODO: Replace with LLM-based classification for better accuracy
   */
  async classifyResponse(text: string): Promise<ClassificationResult> {
    const lowerText = text.toLowerCase();

    // Profanity check
    const profanityWords = ["fuck", "shit", "damn", "ass", "hell"];
    if (profanityWords.some((word) => lowerText.includes(word))) {
      return {
        type: ResponseClassification.PROFANITY,
        confidence: 95,
        sentiment: "negative",
        intent: "complaint",
      };
    }

    // DNC request
    if (
      lowerText.includes("stop") ||
      lowerText.includes("unsubscribe") ||
      lowerText.includes("remove me") ||
      lowerText.includes("do not contact")
    ) {
      return {
        type: ResponseClassification.DNC_REQUEST,
        confidence: 90,
        sentiment: "negative",
        intent: "opt_out",
      };
    }

    // Wrong number
    if (
      lowerText.includes("wrong number") ||
      lowerText.includes("wrong person") ||
      lowerText.includes("don't own") ||
      lowerText.includes("not me")
    ) {
      return {
        type: ResponseClassification.WRONG_NUMBER,
        confidence: 85,
        sentiment: "neutral",
        intent: "clarification",
      };
    }

    // Positive indicators
    const positiveWords = [
      "yes",
      "interested",
      "tell me more",
      "sounds good",
      "great",
      "definitely",
      "sure",
      "okay",
      "help",
      "please",
    ];
    if (positiveWords.some((word) => lowerText.includes(word))) {
      return {
        type: ResponseClassification.POSITIVE,
        confidence: 80,
        sentiment: "positive",
        intent: "interested",
      };
    }

    return {
      type: ResponseClassification.NEUTRAL,
      confidence: 60,
      sentiment: "neutral",
      intent: "unclear",
    };
  }

  /**
   * Get bucket based on classification
   */
  getBucketForClassification(classification: ResponseClassification): BucketType {
    const bucketMap: Record<ResponseClassification, BucketType> = {
      [ResponseClassification.POSITIVE]: BucketType.POSITIVE_RESPONSES,
      [ResponseClassification.NEUTRAL]: BucketType.NEUTRAL_REVIEW,
      [ResponseClassification.WRONG_NUMBER]: BucketType.WRONG_NUMBER,
      [ResponseClassification.PROFANITY]: BucketType.PROFANITY_REVIEW,
      [ResponseClassification.DNC_REQUEST]: BucketType.LEGAL_DNC,
      [ResponseClassification.UNCLASSIFIED]: BucketType.UNIVERSAL_INBOX,
    };
    return bucketMap[classification] || BucketType.UNIVERSAL_INBOX;
  }

  /**
   * Move item between buckets
   */
  async moveToBucket(
    inboxItemId: string,
    targetBucket: BucketType,
    movedBy: string,
    reason?: string,
  ) {
    const item = await this.db.query.inboxItems.findFirst({
      where: eq(inboxItemsTable.id, inboxItemId),
    });

    if (!item) return;

    await this.db
      .update(inboxItemsTable)
      .set({ currentBucket: targetBucket })
      .where(eq(inboxItemsTable.id, inboxItemId));

    await this.db.insert(bucketMovementsTable).values({
      teamId: item.teamId,
      inboxItemId,
      fromBucket: item.currentBucket,
      toBucket: targetBucket,
      movedBy,
      reason,
    });

    // Handle suppression buckets
    if (
      targetBucket === BucketType.BLACKLIST ||
      targetBucket === BucketType.LEGAL_DNC
    ) {
      await this.addToSuppressionList(
        item.teamId,
        item.phoneNumber!,
        targetBucket === BucketType.BLACKLIST
          ? SuppressionType.BLACKLIST
          : SuppressionType.LEGAL_DNC,
        reason,
        inboxItemId,
      );
    }
  }

  /**
   * Add phone to suppression list
   */
  private async addToSuppressionList(
    teamId: string,
    phoneNumber: string,
    type: SuppressionType,
    reason?: string,
    sourceInboxItemId?: string,
  ) {
    await this.db.insert(suppressionListTable).values({
      teamId,
      phoneNumber,
      type,
      reason,
      sourceInboxItemId,
      confirmedAt: new Date(),
      confirmedBy: "SYSTEM",
    });

    this.logger.log(`Added ${phoneNumber} to ${type} suppression list`);
  }

  /**
   * Get agent by ID
   */
  async getAgentById(agentId: string): Promise<AiSdrAvatarSelect | undefined> {
    return this.db.query.aiSdrAvatars.findFirst({
      where: eq(aiSdrAvatarsTable.id, agentId),
    });
  }

  /**
   * Get all active agents for a team
   */
  async getActiveAgents(teamId: string): Promise<AiSdrAvatarSelect[]> {
    return this.db.query.aiSdrAvatars.findMany({
      where: and(
        eq(aiSdrAvatarsTable.teamId, teamId),
        eq(aiSdrAvatarsTable.active, true),
      ),
    });
  }
}
