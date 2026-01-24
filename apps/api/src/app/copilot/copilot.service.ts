import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ToolRegistry, ToolResult } from "./tools/tool.registry";
import { CopilotJobService } from "./jobs/copilot-job.service";
import { getSystemPrompt } from "./prompts/system.prompt";
import { ulid } from "ulid";

export interface ChatResponse {
  response: string;
  conversationId: string;
  jobId?: string;
  requiresConfirmation: boolean;
  pendingAction?: string;
  toolCalls?: Array<{ name: string; result: any }>;
}

interface ConversationContext {
  teamId: string;
  surface?: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  pendingAction?: string;
  lastToolResults?: ToolResult[];
}

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);
  private conversations = new Map<string, ConversationContext>();

  constructor(
    private readonly config: ConfigService,
    private readonly toolRegistry: ToolRegistry,
    private readonly jobService: CopilotJobService,
  ) {}

  async chat(
    teamId: string,
    message: string,
    options?: { conversationId?: string; surface?: string },
  ): Promise<ChatResponse> {
    // Get or create conversation
    const conversationId = options?.conversationId || `conv_${ulid()}`;
    let context = this.conversations.get(conversationId);

    if (!context) {
      context = {
        teamId,
        surface: options?.surface,
        messages: [],
      };
      this.conversations.set(conversationId, context);
    }

    // Add user message
    context.messages.push({ role: "user", content: message });

    // Check if this is a confirmation of a pending action
    if (context.pendingAction && this.isConfirmation(message)) {
      return this.executePendingAction(conversationId, context);
    }

    // Process with AI
    try {
      const result = await this.processWithAI(context, teamId);

      // Store any pending action
      if (result.pendingAction) {
        context.pendingAction = result.pendingAction;
      } else {
        context.pendingAction = undefined;
      }

      // Add assistant response
      context.messages.push({ role: "assistant", content: result.response });

      return {
        ...result,
        conversationId,
      };
    } catch (err: any) {
      this.logger.error(`Chat error: ${err.message}`);
      return {
        response: `I encountered an error: ${err.message}. Please try again.`,
        conversationId,
        requiresConfirmation: false,
      };
    }
  }

  private isConfirmation(message: string): boolean {
    const lower = message.toLowerCase().trim();
    return ["yes", "y", "confirm", "proceed", "ok", "go", "do it"].includes(
      lower,
    );
  }

  private async executePendingAction(
    conversationId: string,
    context: ConversationContext,
  ): Promise<ChatResponse> {
    const action = context.pendingAction!;
    context.pendingAction = undefined;

    // Start async job for the action
    const jobId = await this.jobService.createJob(action, {
      teamId: context.teamId,
      toolResults: context.lastToolResults,
    });

    // Execute the action in background
    this.executeActionAsync(jobId, action, context);

    return {
      response: `Starting ${action}... Track progress at /copilot/jobs/${jobId}`,
      conversationId,
      jobId,
      requiresConfirmation: false,
    };
  }

  private async executeActionAsync(
    jobId: string,
    action: string,
    context: ConversationContext,
  ): Promise<void> {
    try {
      await this.jobService.updateStatus(jobId, "running", 0);

      // Execute based on action type
      const result = await this.toolRegistry.executeTool(
        action,
        { teamId: context.teamId },
        (progress) => this.jobService.updateProgress(jobId, progress),
      );

      await this.jobService.complete(jobId, result);
    } catch (err: any) {
      await this.jobService.fail(jobId, err.message);
    }
  }

  private async processWithAI(
    context: ConversationContext,
    teamId: string,
  ): Promise<Omit<ChatResponse, "conversationId">> {
    // Build messages for AI
    const systemPrompt = getSystemPrompt(teamId, context.surface);
    const tools = this.toolRegistry.getToolSchemas();

    // For now, use a simple approach - call OpenAI with function calling
    // In production, this would use the AI Orchestrator
    const openaiKey = this.config.get<string>("OPENAI_API_KEY");

    if (!openaiKey) {
      // Fallback to simple pattern matching if no API key
      return this.fallbackProcessing(context, teamId);
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              ...context.messages,
            ],
            tools: tools.map((t) => ({ type: "function", function: t })),
            tool_choice: "auto",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "OpenAI API error");
      }

      const choice = data.choices[0];
      const message = choice.message;

      // Check if AI wants to call tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        return this.handleToolCalls(message.tool_calls, context, teamId);
      }

      // Return text response
      return {
        response: message.content || "I understand. How can I help?",
        requiresConfirmation: false,
      };
    } catch (err: any) {
      this.logger.error(`OpenAI error: ${err.message}`);
      return this.fallbackProcessing(context, teamId);
    }
  }

  private async handleToolCalls(
    toolCalls: any[],
    context: ConversationContext,
    teamId: string,
  ): Promise<Omit<ChatResponse, "conversationId">> {
    const results: ToolResult[] = [];

    for (const call of toolCalls) {
      const toolName = call.function.name;
      const args = JSON.parse(call.function.arguments);

      // Execute non-destructive tools immediately
      if (this.toolRegistry.isReadOnly(toolName)) {
        const result = await this.toolRegistry.executeTool(toolName, {
          ...args,
          teamId,
        });
        results.push(result);
      } else {
        // Store for pending confirmation
        context.lastToolResults = results;
        return {
          response: this.formatToolPreview(toolName, args, results),
          requiresConfirmation: true,
          pendingAction: toolName,
          toolCalls: results.map((r) => ({ name: r.tool, result: r.data })),
        };
      }
    }

    // All tools were read-only, format response
    return {
      response: this.formatToolResults(results),
      requiresConfirmation: false,
      toolCalls: results.map((r) => ({ name: r.tool, result: r.data })),
    };
  }

  private formatToolPreview(
    toolName: string,
    args: any,
    previousResults: ToolResult[],
  ): string {
    const cost = this.toolRegistry.estimateCost(toolName, args);

    let response = "";

    // Include previous results
    for (const result of previousResults) {
      if (result.tool === "analyze_datalake") {
        response += `Found ${result.data.total} leads in the data lake.\n`;
        if (result.data.byPersonName && result.data.byCompanyOnly) {
          response += `- ${result.data.byPersonName} have owner names → $${(result.data.byPersonName * 0.02).toFixed(2)} to trace\n`;
          response += `- ${result.data.byCompanyOnly} are company-only → $${(result.data.byCompanyOnly * 0.15).toFixed(2)} to trace\n`;
        }
      }
    }

    response += `\nReady to run ${toolName}?\n`;
    response += `Estimated cost: $${cost.toFixed(2)}\n`;
    response += `\nType "yes" to proceed or ask for changes.`;

    return response;
  }

  private formatToolResults(results: ToolResult[]): string {
    let response = "";

    for (const result of results) {
      if (result.tool === "analyze_datalake") {
        const data = result.data;
        response += `**Data Lake Analysis**\n\n`;
        response += `Total leads: ${data.total.toLocaleString()}\n`;

        if (data.byVertical) {
          response += `\nBy vertical:\n`;
          for (const [v, count] of Object.entries(data.byVertical)) {
            response += `- ${v}: ${(count as number).toLocaleString()}\n`;
          }
        }

        if (data.byState) {
          response += `\nTop states:\n`;
          const states = Object.entries(data.byState)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 5);
          for (const [state, count] of states) {
            response += `- ${state}: ${(count as number).toLocaleString()}\n`;
          }
        }

        // Cost estimate
        const traceCost = data.total * 0.02;
        response += `\n**Cost Estimate**\n`;
        response += `- Person trace (all): $${traceCost.toFixed(2)}\n`;
        response += `- Phone validation: $${(data.total * 0.015).toFixed(2)}\n`;
      }
    }

    if (!response) {
      response = "Analysis complete. What would you like to do next?";
    }

    return response;
  }

  private async fallbackProcessing(
    context: ConversationContext,
    teamId: string,
  ): Promise<Omit<ChatResponse, "conversationId">> {
    const lastMessage =
      context.messages[context.messages.length - 1].content.toLowerCase();

    // Simple pattern matching
    if (lastMessage.includes("realtor") || lastMessage.includes("florida")) {
      const result = await this.toolRegistry.executeTool("analyze_datalake", {
        teamId,
        vertical: "realtors",
        state: lastMessage.includes("florida") ? "FL" : undefined,
      });

      return {
        response: this.formatToolResults([result]),
        requiresConfirmation: false,
        toolCalls: [{ name: result.tool, result: result.data }],
      };
    }

    if (lastMessage.includes("plumb")) {
      const result = await this.toolRegistry.executeTool("analyze_datalake", {
        teamId,
        vertical: "plumbing",
      });

      return {
        response: this.formatToolResults([result]),
        requiresConfirmation: false,
        toolCalls: [{ name: result.tool, result: result.data }],
      };
    }

    if (lastMessage.includes("consult")) {
      const result = await this.toolRegistry.executeTool("analyze_datalake", {
        teamId,
        vertical: "consultants",
      });

      return {
        response: this.formatToolResults([result]),
        requiresConfirmation: false,
        toolCalls: [{ name: result.tool, result: result.data }],
      };
    }

    return {
      response: `I can help you with:\n- Analyzing your data lake ("show me Florida realtors")\n- Skip tracing leads ("trace these leads")\n- Validating phone numbers ("validate phones")\n\nWhat would you like to do?`,
      requiresConfirmation: false,
    };
  }
}
