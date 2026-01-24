import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and, desc } from "drizzle-orm";
import {
  leadsTable,
  messagesTable,
  workerPhoneAssignmentsTable,
} from "@/database/schema-alias";

/**
 * AGENT ROUTER SERVICE
 *
 * Routes inbound messages to the appropriate AI agent:
 * - GIANNA: Opener - First contact, initial engagement
 * - CATHY: Nurture - Follow-up, relationship building, humor
 * - SABRINA: Closer - High intent, scheduling, deal making
 *
 * Each agent has their own phone number(s) assigned per team.
 */

export type AgentType = "gianna" | "cathy" | "sabrina";

interface AgentAssignment {
  agent: AgentType;
  agentPhone: string;
  reason: string;
}

interface ConversationContext {
  messageCount: number;
  lastAgentUsed?: AgentType;
  leadStage: string;
  hasPositiveResponse: boolean;
  hasSchedulingIntent: boolean;
}

@Injectable()
export class AgentRouterService {
  private readonly logger = new Logger(AgentRouterService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Determine which agent should handle this message
   *
   * PRIMARY RULE: The agent who sent the LAST outbound SMS continues the conversation
   * This maintains consistency for the lead - they're talking to the same "person"
   */
  async routeToAgent(
    teamId: string,
    leadId: string,
    incomingMessage: string,
    inboundToNumber?: string, // The number the lead replied TO
  ): Promise<AgentAssignment> {
    // FIRST: Check which number the lead replied to (if provided)
    if (inboundToNumber) {
      const agentFromNumber = await this.getAgentFromPhone(
        teamId,
        inboundToNumber,
      );
      if (agentFromNumber) {
        this.logger.log(
          `Routing to ${agentFromNumber.toUpperCase()} - lead replied to their number: ${inboundToNumber}`,
        );
        return {
          agent: agentFromNumber,
          agentPhone: inboundToNumber,
          reason: `Conversation continuity - lead replied to ${agentFromNumber.toUpperCase()}'s number`,
        };
      }
    }

    // SECOND: Find the last outbound message to this lead
    const lastOutbound = await this.getLastOutboundMessage(leadId);
    if (lastOutbound?.fromPhone) {
      const agentFromLastMessage = await this.getAgentFromPhone(
        teamId,
        lastOutbound.fromPhone,
      );
      if (agentFromLastMessage) {
        this.logger.log(
          `Routing to ${agentFromLastMessage.toUpperCase()} - sent last outbound from: ${lastOutbound.fromPhone}`,
        );
        return {
          agent: agentFromLastMessage,
          agentPhone: lastOutbound.fromPhone,
          reason: `Conversation continuity - ${agentFromLastMessage.toUpperCase()} sent last message`,
        };
      }
    }

    // FALLBACK: New conversation, use routing logic
    const context = await this.getConversationContext(teamId, leadId);
    const agent = this.determineAgent(context, incomingMessage);
    const agentPhone = await this.getAgentPhone(teamId, agent);

    this.logger.log(
      `Routing to ${agent.toUpperCase()} (${agentPhone}) - NEW conversation, ${context.messageCount} messages`,
    );

    return {
      agent,
      agentPhone,
      reason: this.getRoutingReason(agent, context),
    };
  }

  /**
   * Get agent type from phone number
   */
  private async getAgentFromPhone(
    teamId: string,
    phoneNumber: string,
  ): Promise<AgentType | undefined> {
    // Normalize phone
    const normalized = phoneNumber.replace(/\D/g, "").slice(-10);

    // Check worker_phone_assignments table
    const assignment = await this.db.query.workerPhoneAssignments.findFirst({
      where: and(
        eq(workerPhoneAssignmentsTable.teamId, teamId),
        eq(workerPhoneAssignmentsTable.isActive, true),
      ),
    });

    // Find by matching phone number
    const allAssignments =
      await this.db.query.workerPhoneAssignments.findMany({
        where: and(
          eq(workerPhoneAssignmentsTable.teamId, teamId),
          eq(workerPhoneAssignmentsTable.isActive, true),
        ),
      });

    for (const a of allAssignments) {
      const normalizedAssignment = a.phoneNumber.replace(/\D/g, "").slice(-10);
      if (normalizedAssignment === normalized) {
        return a.workerId as AgentType;
      }
    }

    // Check env vars
    const envPhones: Record<string, AgentType> = {};
    if (process.env.GIANNA_PHONE_NUMBER) {
      envPhones[process.env.GIANNA_PHONE_NUMBER.replace(/\D/g, "").slice(-10)] =
        "gianna";
    }
    if (process.env.CATHY_PHONE_NUMBER) {
      envPhones[process.env.CATHY_PHONE_NUMBER.replace(/\D/g, "").slice(-10)] =
        "cathy";
    }
    if (process.env.SABRINA_PHONE_NUMBER) {
      envPhones[
        process.env.SABRINA_PHONE_NUMBER.replace(/\D/g, "").slice(-10)
      ] = "sabrina";
    }

    return envPhones[normalized];
  }

  /**
   * Get last outbound message to a lead
   */
  private async getLastOutboundMessage(
    leadId: string,
  ): Promise<{ fromPhone: string } | undefined> {
    const lastOutbound = await this.db.query.messages.findFirst({
      where: and(
        eq(messagesTable.leadId, leadId),
        eq(messagesTable.direction, "outbound"),
      ),
      orderBy: [desc(messagesTable.createdAt)],
    });

    if (lastOutbound?.fromPhone) {
      return { fromPhone: lastOutbound.fromPhone };
    }

    return undefined;
  }

  /**
   * Get conversation context for routing decision
   */
  private async getConversationContext(
    teamId: string,
    leadId: string,
  ): Promise<ConversationContext> {
    // Get lead info
    const lead = await this.db.query.leads.findFirst({
      where: and(eq(leadsTable.id, leadId), eq(leadsTable.teamId, teamId)),
    });

    // Get message history
    const messages = await this.db.query.messages.findMany({
      where: eq(messagesTable.leadId, leadId),
      orderBy: [desc(messagesTable.createdAt)],
      limit: 20,
    });

    // Analyze conversation
    const lastInbound = messages.find((m) => m.direction === "inbound");
    const schedulingKeywords = /\b(schedule|meet|call|time|when|calendar|appointment|available)\b/i;
    const hasSchedulingIntent = messages.some(
      (m) => m.direction === "inbound" && schedulingKeywords.test(m.body || ""),
    );

    return {
      messageCount: messages.length,
      lastAgentUsed: this.extractLastAgent(messages),
      leadStage: lead?.pipelineStatus || "raw",
      hasPositiveResponse: lead?.pipelineStatus === "high_intent",
      hasSchedulingIntent,
    };
  }

  /**
   * Determine which agent based on conversation context
   */
  private determineAgent(
    context: ConversationContext,
    incomingMessage: string,
  ): AgentType {
    const lowerMessage = incomingMessage.toLowerCase();

    // SABRINA: Scheduling intent or high intent lead
    if (
      context.hasSchedulingIntent ||
      /\b(schedule|meet|call|time|when|calendar|appointment|available|book)\b/i.test(
        lowerMessage,
      )
    ) {
      return "sabrina";
    }

    // SABRINA: High intent stage
    if (
      context.leadStage === "high_intent" ||
      context.leadStage === "qualified"
    ) {
      return "sabrina";
    }

    // GIANNA: First contact or early stage (0-2 messages)
    if (context.messageCount <= 2) {
      return "gianna";
    }

    // CATHY: Nurture stage (3+ messages, building relationship)
    if (context.messageCount >= 3 && context.messageCount <= 10) {
      return "cathy";
    }

    // SABRINA: Later stage conversations (10+ messages)
    if (context.messageCount > 10) {
      return "sabrina";
    }

    // Default to last agent used, or GIANNA
    return context.lastAgentUsed || "gianna";
  }

  /**
   * Get agent's phone number for the team
   */
  async getAgentPhone(teamId: string, agent: AgentType): Promise<string> {
    const assignment = await this.db.query.workerPhoneAssignments.findFirst({
      where: and(
        eq(workerPhoneAssignmentsTable.teamId, teamId),
        eq(workerPhoneAssignmentsTable.workerId, agent),
        eq(workerPhoneAssignmentsTable.isActive, true),
      ),
    });

    if (assignment) {
      return assignment.phoneNumber;
    }

    // Fallback to environment variables
    const envMap: Record<AgentType, string | undefined> = {
      gianna: process.env.GIANNA_PHONE_NUMBER,
      cathy: process.env.CATHY_PHONE_NUMBER,
      sabrina: process.env.SABRINA_PHONE_NUMBER,
    };

    const envPhone = envMap[agent];
    if (envPhone) {
      return envPhone;
    }

    // Last fallback: use any configured phone
    const fallback =
      process.env.GIANNA_PHONE_NUMBER ||
      process.env.TWILIO_PHONE_NUMBER ||
      process.env.DEFAULT_PHONE_NUMBER;

    this.logger.warn(
      `No phone configured for ${agent} on team ${teamId}, using fallback: ${fallback}`,
    );

    return fallback || "";
  }

  /**
   * Extract which agent was used last from message history
   */
  private extractLastAgent(messages: any[]): AgentType | undefined {
    // Look for outbound message metadata to determine last agent
    const lastOutbound = messages.find((m) => m.direction === "outbound");
    if (lastOutbound?.metadata?.agent) {
      return lastOutbound.metadata.agent as AgentType;
    }
    return undefined;
  }

  /**
   * Get human-readable routing reason
   */
  private getRoutingReason(
    agent: AgentType,
    context: ConversationContext,
  ): string {
    switch (agent) {
      case "gianna":
        return `Opener - ${context.messageCount <= 2 ? "early conversation" : "initial engagement"}`;
      case "cathy":
        return `Nurture - ${context.messageCount} messages, building relationship`;
      case "sabrina":
        if (context.hasSchedulingIntent) return "Closer - scheduling intent detected";
        if (context.leadStage === "high_intent") return "Closer - high intent lead";
        return `Closer - mature conversation (${context.messageCount} messages)`;
      default:
        return "Default routing";
    }
  }

  /**
   * Get all agent phone assignments for a team
   */
  async getTeamAgentPhones(teamId: string): Promise<Record<AgentType, string>> {
    const assignments = await this.db.query.workerPhoneAssignments.findMany({
      where: and(
        eq(workerPhoneAssignmentsTable.teamId, teamId),
        eq(workerPhoneAssignmentsTable.isActive, true),
      ),
    });

    const result: Record<AgentType, string> = {
      gianna: "",
      cathy: "",
      sabrina: "",
    };

    for (const assignment of assignments) {
      if (assignment.workerId in result) {
        result[assignment.workerId as AgentType] = assignment.phoneNumber;
      }
    }

    // Fill in from env vars if missing
    if (!result.gianna) result.gianna = process.env.GIANNA_PHONE_NUMBER || "";
    if (!result.cathy) result.cathy = process.env.CATHY_PHONE_NUMBER || "";
    if (!result.sabrina) result.sabrina = process.env.SABRINA_PHONE_NUMBER || "";

    return result;
  }
}
