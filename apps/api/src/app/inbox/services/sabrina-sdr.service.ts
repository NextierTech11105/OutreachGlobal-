import { Injectable, Logger, BadRequestException } from "@nestjs/common";
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
  aiResponseApprovalsTable,
} from "@/database/schema-alias";
import {
  ResponseClassification,
  InboxPriority,
  BucketType,
  SuppressionType,
} from "@nextier/common";
import { AiApprovalStatus } from "@/database/schema/inbox.schema";

// Types
interface SabrinaAssignment {
  sdrId: string;
  sdrName: string;
  campaignId: string;
  campaignName: string;
  initialMessageId: string;
  initialMessageContent: string;
  responseDelay: number;
}

interface InboxTriggerResult {
  inboxItemId: string;
  classification: ResponseClassification;
  priority: InboxPriority;
  assignment?: SabrinaAssignment;
  pendingApprovalId?: string; // AI-suggested response queued for human review
  suggestedResponse?: string;
}

interface PrioritizationInput {
  classification: ResponseClassification;
  classificationConfidence: number;
  sentiment: string;
  intent: string;
  messageAge: number;
  leadScore?: number;
  hasActiveSDR: boolean;
}

@Injectable()
export class SabrinaSdrService {
  private readonly logger = new Logger(SabrinaSdrService.name);

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

    // Low confidence = lower priority, requires human review
    if (input.classificationConfidence < 70) {
      score -= 15; // Penalize uncertainty - don't reward it
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
   * Process incoming response and trigger Sabrina assignment
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

    // 5. Get Sabrina assignment if positive response
    let assignment: SabrinaAssignment | undefined;
    let pendingApprovalId: string | undefined;
    let suggestedResponse: string | undefined;

    if (classification.type === ResponseClassification.POSITIVE && campaignId) {
      assignment = await this.assignSabrina(teamId, campaignId, inboxItem.id);

      if (assignment) {
        // Generate suggested response
        suggestedResponse = await this.generateResponse(
          assignment,
          responseText,
          lead?.firstName,
        );

        // ALWAYS queue for human approval - AI cannot send automatically
        const [approval] = await this.db
          .insert(aiResponseApprovalsTable)
          .values({
            teamId,
            inboxItemId: inboxItem.id,
            suggestedResponse,
            sdrId: assignment.sdrId,
            status: "pending",
            classificationContext: {
              classification: classification.type,
              confidence: classification.confidence,
              sentiment: classification.sentiment,
              intent: classification.intent,
              originalMessage: responseText,
            },
          })
          .returning();

        pendingApprovalId = approval.id;

        await this.db
          .update(inboxItemsTable)
          .set({ assignedSdrId: assignment.sdrId })
          .where(eq(inboxItemsTable.id, inboxItem.id));

        this.logger.log(
          `Queued response for approval: ${approval.id} (AI cannot send without human review)`,
        );
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
      pendingApprovalId,
      suggestedResponse,
    };
  }

  /**
   * Assign Sabrina SDR to handle the response
   */
  async assignSabrina(
    teamId: string,
    campaignId: string,
    inboxItemId: string,
  ): Promise<SabrinaAssignment | undefined> {
    // 1. Get campaign with SDR
    const campaign = await this.db.query.campaigns.findFirst({
      where: eq(campaignsTable.id, campaignId),
    });

    if (!campaign?.sdrId) {
      this.logger.warn(`No SDR assigned to campaign ${campaignId}`);
      return undefined;
    }

    // 2. Get SDR details
    const sdr = await this.db.query.aiSdrAvatars.findFirst({
      where: and(
        eq(aiSdrAvatarsTable.id, campaign.sdrId),
        eq(aiSdrAvatarsTable.active, true),
      ),
    });

    if (!sdr) {
      this.logger.warn(`SDR ${campaign.sdrId} not found or inactive`);
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

    // 5. Get SDR config for response timing
    const sdrConfig = await this.getSdrConfig(sdr.id, campaignId);

    const minDelay = sdrConfig?.minResponseDelaySeconds ?? 30;
    const maxDelay = sdrConfig?.maxResponseDelaySeconds ?? 300;
    const responseDelay =
      Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;

    this.logger.log(
      `Assigned ${sdr.name} to inbox item ${inboxItemId}, response in ${responseDelay}s`,
    );

    return {
      sdrId: sdr.id,
      sdrName: sdr.name,
      campaignId,
      campaignName: campaign.name,
      initialMessageId: initialMessage.id,
      initialMessageContent: initialMessage.content,
      responseDelay,
    };
  }

  /**
   * Get SDR campaign configuration
   */
  async getSdrConfig(sdrId: string, campaignId: string) {
    return this.db.query.sdrCampaignConfigs.findFirst({
      where: and(
        eq(sdrCampaignConfigsTable.sdrId, sdrId),
        eq(sdrCampaignConfigsTable.campaignId, campaignId),
      ),
    });
  }

  /**
   * Generate AI response
   */
  async generateResponse(
    assignment: SabrinaAssignment,
    incomingMessage: string,
    leadFirstName?: string | null,
  ): Promise<string> {
    const greeting = leadFirstName ? `Hi ${leadFirstName}!` : "Hi there!";
    return `${greeting} Thanks for getting back to me! I'd love to help you explore your options. What questions do you have?`;
  }

  /**
   * Classify response using AI
   */
  private async classifyResponse(text: string): Promise<{
    type: ResponseClassification;
    confidence: number;
    sentiment: string;
    intent: string;
  }> {
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
      lowerText.includes("remove me")
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
      lowerText.includes("don't own")
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
  private getBucketForClassification(
    classification: ResponseClassification,
  ): BucketType {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // HUMAN APPROVAL QUEUE - AI cannot send without explicit human approval
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get pending approvals for a team
   */
  async getPendingApprovals(teamId: string) {
    return this.db.query.aiResponseApprovals.findMany({
      where: and(
        eq(aiResponseApprovalsTable.teamId, teamId),
        eq(aiResponseApprovalsTable.status, "pending"),
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  /**
   * Approve an AI-suggested response - human authorizes sending
   */
  async approveResponse(
    approvalId: string,
    userId: string,
    editedResponse?: string, // Optional: human can modify before sending
  ): Promise<{ success: boolean; approvalId: string; finalResponse: string }> {
    const approval = await this.db.query.aiResponseApprovals.findFirst({
      where: eq(aiResponseApprovalsTable.id, approvalId),
    });

    if (!approval) {
      throw new BadRequestException("Approval not found");
    }

    if (approval.status !== "pending") {
      throw new BadRequestException(
        `Cannot approve: status is ${approval.status}`,
      );
    }

    const finalResponse = editedResponse || approval.suggestedResponse;
    const now = new Date();

    // Update approval record
    await this.db
      .update(aiResponseApprovalsTable)
      .set({
        status: "approved" as AiApprovalStatus,
        reviewedBy: userId,
        reviewedAt: now,
        finalResponse,
        sendKey: `${approval.inboxItemId}:${now.getTime()}`,
      })
      .where(eq(aiResponseApprovalsTable.id, approvalId));

    // Mark inbox item as processed
    await this.db
      .update(inboxItemsTable)
      .set({
        isProcessed: true,
        processedAt: now,
        processedBy: userId,
      })
      .where(eq(inboxItemsTable.id, approval.inboxItemId));

    this.logger.log(
      `Response approved by ${userId}: ${approvalId} - ready to send`,
    );

    // NOTE: Actual sending happens in a separate service after approval
    // This keeps the approval flow clean and testable

    return {
      success: true,
      approvalId,
      finalResponse,
    };
  }

  /**
   * Reject an AI-suggested response - human declines to send
   */
  async rejectResponse(
    approvalId: string,
    userId: string,
    reason: string,
  ): Promise<{ success: boolean; approvalId: string }> {
    const approval = await this.db.query.aiResponseApprovals.findFirst({
      where: eq(aiResponseApprovalsTable.id, approvalId),
    });

    if (!approval) {
      throw new BadRequestException("Approval not found");
    }

    if (approval.status !== "pending") {
      throw new BadRequestException(
        `Cannot reject: status is ${approval.status}`,
      );
    }

    const now = new Date();

    await this.db
      .update(aiResponseApprovalsTable)
      .set({
        status: "rejected" as AiApprovalStatus,
        reviewedBy: userId,
        reviewedAt: now,
        rejectionReason: reason,
      })
      .where(eq(aiResponseApprovalsTable.id, approvalId));

    this.logger.log(
      `Response rejected by ${userId}: ${approvalId} - reason: ${reason}`,
    );

    return {
      success: true,
      approvalId,
    };
  }

  /**
   * Get approval statistics for a team
   */
  async getApprovalStats(teamId: string) {
    const pending = await this.db.$count(
      aiResponseApprovalsTable,
      and(
        eq(aiResponseApprovalsTable.teamId, teamId),
        eq(aiResponseApprovalsTable.status, "pending"),
      ),
    );

    const approved = await this.db.$count(
      aiResponseApprovalsTable,
      and(
        eq(aiResponseApprovalsTable.teamId, teamId),
        eq(aiResponseApprovalsTable.status, "approved"),
      ),
    );

    const rejected = await this.db.$count(
      aiResponseApprovalsTable,
      and(
        eq(aiResponseApprovalsTable.teamId, teamId),
        eq(aiResponseApprovalsTable.status, "rejected"),
      ),
    );

    return {
      pending,
      approved,
      rejected,
      total: pending + approved + rejected,
    };
  }
}
