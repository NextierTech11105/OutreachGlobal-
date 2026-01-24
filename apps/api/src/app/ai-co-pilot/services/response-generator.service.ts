import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and, desc } from "drizzle-orm";
import {
  messagesTable,
  leadsTable,
  campaignsTable,
  teamsTable,
  workerPhoneAssignmentsTable,
} from "@/database/schema-alias";
import { AiOrchestratorService } from "@/app/ai-orchestrator/ai-orchestrator.service";
import {
  ResponseSuggestion,
  SuggestionStatus,
  ResponseTone,
  CoPilotResponse,
  PhoneConfig,
} from "../models/response-suggestion.model";
import { v4 as uuidv4 } from "uuid";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface GenerateOptions {
  maxSuggestions?: number;
  preferredTone?: ResponseTone;
  includeReasoning?: boolean;
}

@Injectable()
export class ResponseGeneratorService {
  private readonly logger = new Logger(ResponseGeneratorService.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    private aiOrchestrator: AiOrchestratorService,
  ) {}

  /**
   * Generate response suggestions for an inbound message
   */
  async generateResponses(
    teamId: string,
    phoneNumber: string,
    inboundMessage: string,
    conversationId: string,
    options: GenerateOptions = {},
  ): Promise<CoPilotResponse> {
    const { maxSuggestions = 3, preferredTone, includeReasoning = true } = options;

    this.logger.log(
      `Generating responses for phone: ${phoneNumber}, conversation: ${conversationId}`,
    );

    // Get phone config for tenant-specific settings
    const config = await this.getPhoneConfig(phoneNumber);
    if (!config) {
      this.logger.warn(`No phone config found for ${phoneNumber}`);
    }

    // Get conversation history
    const history = await this.getConversationHistory(conversationId, 10);

    // Get lead context
    const lead = await this.getLeadByPhone(phoneNumber);

    // Get campaign context if available
    const campaign = lead?.campaignId
      ? await this.getCampaign(lead.campaignId)
      : undefined;

    // Build AI context
    const context = this.buildContext(
      inboundMessage,
      history,
      lead,
      campaign,
      config,
    );

    // Generate suggestions using AI Orchestrator
    const suggestions = await this.generateAISuggestions(
      teamId,
      context,
      maxSuggestions,
      preferredTone,
      includeReasoning,
    );

    return {
      suggestions,
      conversationId,
      phoneNumber,
      inboundMessage,
      leadName: lead?.firstName
        ? `${lead.firstName} ${lead.lastName || ""}`.trim()
        : undefined,
      campaignName: campaign?.name,
      generatedAt: new Date(),
    };
  }

  /**
   * Get phone configuration for tenant-specific response settings
   */
  async getPhoneConfig(phoneNumber: string): Promise<PhoneConfig | null> {
    // Normalize phone number (remove +1 prefix if present)
    const normalizedPhone = phoneNumber.replace(/^\+?1?/, "");

    // First check worker_phone_assignments for direct mapping
    const workerAssignment =
      await this.db.query.workerPhoneAssignments.findFirst({
        where: and(
          eq(workerPhoneAssignmentsTable.phoneNumber, phoneNumber),
          eq(workerPhoneAssignmentsTable.isActive, true),
        ),
      });

    if (workerAssignment) {
      // Get team details
      const team = await this.db.query.teams.findFirst({
        where: eq(teamsTable.id, workerAssignment.teamId),
      });

      return {
        phoneNumber,
        teamId: workerAssignment.teamId,
        aiAgent: workerAssignment.workerId,
        responseStyle: this.getResponseStyleForWorker(workerAssignment.workerId),
        coPilotEnabled: true,
        signalhouseSubGroupId: team?.signalhouseSubGroupId || undefined,
      };
    }

    // Try alternate phone formats
    const altFormats = [
      phoneNumber,
      normalizedPhone,
      `+1${normalizedPhone}`,
      `1${normalizedPhone}`,
    ];

    for (const format of altFormats) {
      const assignment = await this.db.query.workerPhoneAssignments.findFirst({
        where: and(
          eq(workerPhoneAssignmentsTable.phoneNumber, format),
          eq(workerPhoneAssignmentsTable.isActive, true),
        ),
      });

      if (assignment) {
        const team = await this.db.query.teams.findFirst({
          where: eq(teamsTable.id, assignment.teamId),
        });

        return {
          phoneNumber: format,
          teamId: assignment.teamId,
          aiAgent: assignment.workerId,
          responseStyle: this.getResponseStyleForWorker(assignment.workerId),
          coPilotEnabled: true,
          signalhouseSubGroupId: team?.signalhouseSubGroupId || undefined,
        };
      }
    }

    // Check teams table for phone pool
    const teamsWithPhone = await this.db.query.teams.findMany({
      columns: {
        id: true,
        signalhouseSubGroupId: true,
        signalhousePhonePool: true,
      },
    });

    for (const team of teamsWithPhone) {
      const phonePool = team.signalhousePhonePool as string[] | null;
      if (phonePool && phonePool.some((p) => altFormats.includes(p))) {
        return {
          phoneNumber,
          teamId: team.id,
          aiAgent: "gianna", // Default to GIANNA for pool numbers
          responseStyle: "professional",
          coPilotEnabled: true,
          signalhouseSubGroupId: team.signalhouseSubGroupId || undefined,
        };
      }
    }

    return null;
  }

  /**
   * Get conversation history for context
   * Queries messages by leadId since messages table uses leadId not conversationId
   */
  async getConversationHistory(
    conversationId: string,
    limit: number = 10,
  ): Promise<ConversationMessage[]> {
    // conversationId is typically the leadId for SMS conversations
    const messages = await this.db.query.messages.findMany({
      where: eq(messagesTable.leadId, conversationId),
      orderBy: [desc(messagesTable.createdAt)],
      limit,
    });

    return messages
      .reverse()
      .map((msg) => ({
        role: msg.direction === "INBOUND" ? "user" : "assistant",
        content: msg.body || "",
        timestamp: msg.createdAt || new Date(),
      })) as ConversationMessage[];
  }

  /**
   * Get lead by phone number
   */
  private async getLeadByPhone(phoneNumber: string) {
    const normalizedPhone = phoneNumber.replace(/^\+?1?/, "");

    return this.db.query.leads.findFirst({
      where: eq(leadsTable.phone, normalizedPhone),
    });
  }

  /**
   * Get campaign details
   */
  private async getCampaign(campaignId: string) {
    return this.db.query.campaigns.findFirst({
      where: eq(campaignsTable.id, campaignId),
    });
  }

  /**
   * Build context for AI prompt
   */
  private buildContext(
    inboundMessage: string,
    history: ConversationMessage[],
    lead: Awaited<ReturnType<typeof this.getLeadByPhone>>,
    campaign: Awaited<ReturnType<typeof this.getCampaign>> | undefined,
    config: PhoneConfig | null,
  ): string {
    const parts: string[] = [];

    // Lead context
    if (lead) {
      parts.push(
        `LEAD INFO:`,
        `- Name: ${lead.firstName || "Unknown"} ${lead.lastName || ""}`.trim(),
        lead.email ? `- Email: ${lead.email}` : "",
        lead.company ? `- Company: ${lead.company}` : "",
        lead.title ? `- Title: ${lead.title}` : "",
        "",
      );
    }

    // Campaign context
    if (campaign) {
      parts.push(`CAMPAIGN: ${campaign.name}`, "");
    }

    // Agent personality
    if (config?.aiAgent) {
      const personality = this.getAgentPersonality(config.aiAgent);
      parts.push(`AGENT STYLE: ${personality}`, "");
    }

    // Conversation history
    if (history.length > 0) {
      parts.push("CONVERSATION HISTORY:");
      history.forEach((msg) => {
        const role = msg.role === "user" ? "Customer" : "Agent";
        parts.push(`${role}: ${msg.content}`);
      });
      parts.push("");
    }

    // Current message
    parts.push(`CURRENT INBOUND MESSAGE: ${inboundMessage}`);

    return parts.filter(Boolean).join("\n");
  }

  /**
   * Generate AI suggestions using the orchestrator
   */
  private async generateAISuggestions(
    teamId: string,
    context: string,
    maxSuggestions: number,
    preferredTone?: ResponseTone,
    includeReasoning?: boolean,
  ): Promise<ResponseSuggestion[]> {
    const toneInstruction = preferredTone
      ? `Preferred tone: ${preferredTone.toLowerCase()}`
      : "Match the appropriate tone based on context";

    const prompt = `You are an AI co-pilot helping a sales agent respond to customer messages.

${context}

Generate ${maxSuggestions} different response suggestions. Each should:
1. Be natural and conversational
2. Address the customer's message directly
3. Move the conversation toward a positive outcome
4. ${toneInstruction}

${includeReasoning ? "Include brief reasoning for each suggestion." : ""}

Respond in JSON format:
{
  "suggestions": [
    {
      "content": "response text",
      "confidence": 0.0-1.0,
      "tone": "PROFESSIONAL|FRIENDLY|CASUAL|URGENT",
      "reasoning": "why this response works"
    }
  ]
}`;

    try {
      const result = await this.aiOrchestrator.execute<
        { prompt: string },
        { suggestions: Array<{
          content: string;
          confidence: number;
          tone: string;
          reasoning?: string;
        }> }
      >({
        task: "sms_generate",
        priority: "interactive",
        context: {
          teamId,
          userId: "co-pilot",
          traceId: uuidv4(),
          channel: "sms",
        },
        input: { prompt },
      });

      // OrchestratorResult has output property - check if suggestions exist
      if (result.output?.suggestions) {
        return result.output.suggestions.map((s) => ({
          id: uuidv4(),
          content: s.content,
          confidence: Math.min(1, Math.max(0, s.confidence)),
          tone: this.parseTone(s.tone),
          reasoning: s.reasoning,
          status: SuggestionStatus.PENDING,
          createdAt: new Date(),
        }));
      }

      // Fallback to template-based suggestions
      return this.getTemplateSuggestions(context, maxSuggestions);
    } catch (error) {
      this.logger.error(`AI suggestion generation failed: ${error}`);
      return this.getTemplateSuggestions(context, maxSuggestions);
    }
  }

  /**
   * Fallback template-based suggestions
   */
  private getTemplateSuggestions(
    _context: string,
    maxSuggestions: number,
  ): ResponseSuggestion[] {
    const templates = [
      {
        content:
          "Thanks for getting back to me! I'd love to help you explore your options. What questions do you have?",
        confidence: 0.75,
        tone: ResponseTone.FRIENDLY,
        reasoning: "Acknowledges response and invites further conversation",
      },
      {
        content:
          "Great to hear from you! Would you have a few minutes this week to chat about how we can help?",
        confidence: 0.7,
        tone: ResponseTone.PROFESSIONAL,
        reasoning: "Moves toward scheduling a call",
      },
      {
        content:
          "Thanks for your interest! What's the best time for a quick call to discuss your needs?",
        confidence: 0.65,
        tone: ResponseTone.CASUAL,
        reasoning: "Direct ask for scheduling",
      },
    ];

    return templates.slice(0, maxSuggestions).map((t) => ({
      id: uuidv4(),
      content: t.content,
      confidence: t.confidence,
      tone: t.tone,
      reasoning: t.reasoning,
      status: SuggestionStatus.PENDING,
      createdAt: new Date(),
    }));
  }

  /**
   * Parse tone string to enum
   */
  private parseTone(tone: string): ResponseTone {
    const normalized = tone?.toUpperCase();
    if (Object.values(ResponseTone).includes(normalized as ResponseTone)) {
      return normalized as ResponseTone;
    }
    return ResponseTone.PROFESSIONAL;
  }

  /**
   * Get response style for worker
   */
  private getResponseStyleForWorker(workerId: string): string {
    const styles: Record<string, string> = {
      gianna: "professional",
      cathy: "friendly-humorous",
      sabrina: "professional-closing",
      neva: "research-focused",
    };
    return styles[workerId.toLowerCase()] || "professional";
  }

  /**
   * Get agent personality description
   */
  private getAgentPersonality(agentId: string): string {
    const personalities: Record<string, string> = {
      gianna:
        "Professional and efficient opener. Gets straight to the point while being personable.",
      cathy:
        "Warm and nurturing with touches of humor. Builds rapport over time.",
      sabrina:
        "Focused closer. Professional and goal-oriented. Drives toward scheduling.",
      neva: "Research-focused. Provides detailed, accurate information.",
    };
    return personalities[agentId.toLowerCase()] || "Professional and helpful.";
  }

  /**
   * Accept a suggestion (mark as used)
   */
  async acceptSuggestion(
    suggestionId: string,
    teamId: string,
    userId: string,
  ): Promise<boolean> {
    this.logger.log(
      `Suggestion ${suggestionId} accepted by ${userId} for team ${teamId}`,
    );
    // Track acceptance for learning/analytics
    // Could store in a suggestions_analytics table
    return true;
  }

  /**
   * Reject a suggestion
   */
  async rejectSuggestion(
    suggestionId: string,
    teamId: string,
    userId: string,
    reason?: string,
  ): Promise<boolean> {
    this.logger.log(
      `Suggestion ${suggestionId} rejected by ${userId}: ${reason || "no reason"}`,
    );
    return true;
  }
}
