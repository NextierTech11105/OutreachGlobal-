import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import {
  AgentExecutionService,
  AgentAssignment,
  InboxTriggerResult,
  PrioritizationInput,
} from "./agent-execution.service";
import { InboxPriority, BucketType } from "@nextier/common";

/**
 * @deprecated Use AgentExecutionService instead.
 *
 * This service is maintained for backward compatibility only.
 * All new code should use AgentExecutionService which supports
 * dynamic agent configuration from the database.
 *
 * Migration guide:
 * - Replace SabrinaSdrService with AgentExecutionService
 * - SabrinaAssignment → AgentAssignment
 * - assignSabrina() → assignAgent()
 */

// Legacy type alias for backward compatibility
export type SabrinaAssignment = AgentAssignment;

@Injectable()
export class SabrinaSdrService {
  private readonly logger = new Logger(SabrinaSdrService.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    private agentExecutionService: AgentExecutionService,
  ) {
    this.logger.warn(
      "SabrinaSdrService is deprecated. Use AgentExecutionService instead.",
    );
  }

  /**
   * @deprecated Use AgentExecutionService.calculatePriorityScore()
   */
  calculatePriorityScore(input: PrioritizationInput): {
    score: number;
    priority: InboxPriority;
  } {
    return this.agentExecutionService.calculatePriorityScore(input);
  }

  /**
   * @deprecated Use AgentExecutionService.processIncomingResponse()
   */
  async processIncomingResponse(
    teamId: string,
    messageId: string,
    responseText: string,
    fromPhone: string,
    campaignId?: string,
  ): Promise<InboxTriggerResult> {
    return this.agentExecutionService.processIncomingResponse(
      teamId,
      messageId,
      responseText,
      fromPhone,
      campaignId,
    );
  }

  /**
   * @deprecated Use AgentExecutionService.assignAgent()
   */
  async assignSabrina(
    teamId: string,
    campaignId: string,
    inboxItemId: string,
  ): Promise<SabrinaAssignment | undefined> {
    return this.agentExecutionService.assignAgent(
      teamId,
      campaignId,
      inboxItemId,
    );
  }

  /**
   * @deprecated Use AgentExecutionService.getAgentConfig()
   */
  async getSdrConfig(sdrId: string, campaignId: string) {
    return this.agentExecutionService.getAgentConfig(sdrId, campaignId);
  }

  /**
   * @deprecated Use AgentExecutionService.generateResponse()
   */
  async generateResponse(
    assignment: SabrinaAssignment,
    incomingMessage: string,
    leadFirstName?: string | null,
  ): Promise<string> {
    return this.agentExecutionService.generateResponse(
      assignment,
      incomingMessage,
      leadFirstName,
    );
  }

  /**
   * @deprecated Use AgentExecutionService.moveToBucket()
   */
  async moveToBucket(
    inboxItemId: string,
    targetBucket: BucketType,
    movedBy: string,
    reason?: string,
  ) {
    return this.agentExecutionService.moveToBucket(
      inboxItemId,
      targetBucket,
      movedBy,
      reason,
    );
  }
}
