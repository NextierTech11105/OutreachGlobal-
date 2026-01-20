/**
 * AI Orchestrator Service
 * Single entrypoint for all AI operations with:
 * - Provider routing
 * - Fallback chains
 * - Usage tracking
 * - Prompt versioning
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { aiPrompts } from "@/database/schema/ai-prompts.schema";
import { and, eq, desc } from "drizzle-orm";
import { CacheService } from "@/lib/cache/cache.service";
import { CircuitBreakerService } from "@/lib/circuit-breaker/circuit-breaker.service";
import * as crypto from "crypto";
import {
  OpenAIClient,
  AnthropicClient,
  PerplexityClient,
  AiProvider,
  AiTask,
  AiContext,
  OrchestratorRequest,
  OrchestratorResult,
  TASK_MODEL_MAP,
  FALLBACK_CHAINS,
  ChatMessage,
  ProviderCallOptions,
} from "./providers";
import { UsageMeterService } from "./usage";

export interface ExecuteOptions {
  skipLimitCheck?: boolean;
  skipFallback?: boolean;
}

@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    private openai: OpenAIClient,
    private anthropic: AnthropicClient,
    private perplexity: PerplexityClient,
    private usageMeter: UsageMeterService,
    private cache: CacheService,
    private circuitBreaker: CircuitBreakerService,
  ) {}

  /**
   * Execute an AI task with full hardening
   */
  async execute<TInput = unknown, TOutput = unknown>(
    request: OrchestratorRequest<TInput>,
    options: ExecuteOptions = {},
  ): Promise<OrchestratorResult<TOutput>> {
    const startTime = Date.now();
    const { task, context, input, promptKey, priority } = request;

    this.logger.log(
      `AI task started: task=${task} traceId=${context.traceId} team=${context.teamId}`,
    );

    // Check usage limits (unless skipped for internal calls)
    if (!options.skipLimitCheck) {
      const limitCheck = await this.usageMeter.checkLimits(context.teamId);
      if (!limitCheck.allowed) {
        throw new Error(`Usage limit exceeded: ${limitCheck.reason}`);
      }
    }

    // Check cache for research tasks (Perplexity)
    if (task === "research_verify" || task === "research_deep") {
      const cacheKey = `neva:${task}:${crypto.createHash("md5").update(JSON.stringify(input)).digest("hex")}`;
      try {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          this.logger.log(
            `[AI Orchestrator] Cache HIT for ${task} traceId=${context.traceId}`,
          );
          return {
            output: cached as TOutput,
            provider: "perplexity" as AiProvider,
            model: "llama-3.1-sonar-small-128k-online",
            degraded: false,
            traceId: context.traceId,
            latencyMs: Date.now() - startTime,
            cached: true,
          } as OrchestratorResult<TOutput>;
        }
      } catch (err) {
        this.logger.debug(`Cache check failed: ${err}`);
      }
    }

    // Get prompt (from DB or default)
    const prompt = await this.getPrompt(context.teamId, promptKey || task);

    // Build messages
    const messages = this.buildMessages(prompt, input);

    // Get provider/model routing
    const routing = TASK_MODEL_MAP[task];
    const providers: AiProvider[] = options.skipFallback
      ? [routing.provider]
      : [routing.provider, ...(FALLBACK_CHAINS[routing.provider] || [])];

    let lastError: Error | null = null;
    let degraded = false;

    // Try each provider in chain
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const model =
        i === 0
          ? prompt?.model || routing.model
          : this.getFallbackModel(provider, task);

      try {
        const callOptions: ProviderCallOptions = {
          model,
          messages,
          maxTokens: prompt?.maxTokens || this.getDefaultMaxTokens(task),
          temperature: prompt?.temperature ?? 0.7,
          responseFormat: this.shouldUseJson(task)
            ? { type: "json_object" }
            : undefined,
        };

        const response = await this.callProvider(provider, callOptions);

        // Record usage
        await this.usageMeter.recordUsage(
          context,
          task,
          provider,
          model,
          response.usage,
          response.latencyMs,
          true,
        );

        // Parse output
        const output = this.parseOutput<TOutput>(response.content, task);

        // Cache research results (1 hour TTL)
        if (task === "research_verify" || task === "research_deep") {
          const cacheKey = `neva:${task}:${crypto.createHash("md5").update(JSON.stringify(input)).digest("hex")}`;
          try {
            await this.cache.set(cacheKey, output, 3600);
            this.logger.log(
              `[AI Orchestrator] Cache MISS - stored result for ${task}`,
            );
          } catch (err) {
            this.logger.debug(`Cache set failed: ${err}`);
          }
        }

        this.logger.log(
          `AI task completed: task=${task} provider=${provider} model=${model} latency=${response.latencyMs}ms degraded=${degraded}`,
        );

        return {
          output,
          provider,
          model,
          degraded,
          usage: response.usage || undefined,
          traceId: context.traceId,
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `AI provider failed: provider=${provider} error=${lastError.message}`,
        );

        // Record failed usage
        await this.usageMeter.recordUsage(
          context,
          task,
          provider,
          model,
          null,
          Date.now() - startTime,
          false,
        );

        // Mark as degraded if we're falling back
        if (i < providers.length - 1) {
          degraded = true;
          this.logger.log(`Falling back to next provider: ${providers[i + 1]}`);
        }
      }
    }

    // All providers failed
    this.logger.error(
      `All AI providers failed: task=${task} traceId=${context.traceId}`,
    );
    throw lastError || new Error("All AI providers failed");
  }

  /**
   * Convenience method for SMS classification
   */
  async classifySms(
    context: AiContext,
    message: string,
    conversationHistory?: string[],
  ): Promise<{
    intent: "positive" | "negative" | "question" | "neutral" | "opt_out";
    confidence: number;
    reasoning: string;
  }> {
    const result = await this.execute<
      { message: string; history?: string[] },
      { intent: string; confidence: number; reasoning: string }
    >({
      task: "sms_classify",
      priority: "interactive",
      context,
      input: { message, history: conversationHistory },
      promptKey: "sms_classify",
    });

    return {
      intent: result.output.intent as
        | "positive"
        | "negative"
        | "question"
        | "neutral"
        | "opt_out",
      confidence: result.output.confidence,
      reasoning: result.output.reasoning,
    };
  }

  /**
   * Convenience method for SMS response generation
   */
  async generateSmsResponse(
    context: AiContext,
    input: {
      incomingMessage: string;
      conversationHistory: string[];
      leadName: string;
      intent?: string;
    },
  ): Promise<{
    response: string;
    shouldEscalate: boolean;
  }> {
    const result = await this.execute<
      typeof input,
      { response: string; shouldEscalate: boolean }
    >({
      task: "sms_generate",
      priority: "interactive",
      context,
      input,
      promptKey: "sms_generate",
    });

    return result.output;
  }

  /**
   * Convenience method for deep research
   */
  async researchDeep(
    context: AiContext,
    query: string,
  ): Promise<{
    summary: string;
    keyFindings: string[];
    sources: string[];
  }> {
    const result = await this.execute<
      { query: string },
      { summary: string; keyFindings: string[]; sources: string[] }
    >({
      task: "research_deep",
      priority: "background",
      context,
      input: { query },
      promptKey: "research_deep",
    });

    return result.output;
  }

  // Private helpers

  private async getPrompt(
    teamId: string,
    promptKey: string,
  ): Promise<{
    systemPrompt: string;
    userPromptTemplate: string | null;
    model: string;
    temperature: number;
    maxTokens: number | null;
  } | null> {
    try {
      const [prompt] = await this.db
        .select()
        .from(aiPrompts)
        .where(
          and(
            eq(aiPrompts.teamId, teamId),
            eq(aiPrompts.promptKey, promptKey),
            eq(aiPrompts.isActive, true),
          ),
        )
        .orderBy(desc(aiPrompts.version))
        .limit(1);

      if (prompt) {
        // Increment usage count (fire and forget)
        this.db
          .update(aiPrompts)
          .set({ usageCount: (prompt.usageCount || 0) + 1 })
          .where(eq(aiPrompts.id, prompt.id))
          .catch(() => {});

        return {
          systemPrompt: prompt.systemPrompt,
          userPromptTemplate: prompt.userPromptTemplate,
          model: prompt.model,
          temperature: prompt.temperature,
          maxTokens: prompt.maxTokens,
        };
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load prompt: ${error instanceof Error ? error.message : "Unknown"}`,
      );
    }

    return null;
  }

  private buildMessages<TInput>(
    prompt: Awaited<ReturnType<typeof this.getPrompt>>,
    input: TInput,
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // System message
    const systemContent =
      prompt?.systemPrompt || this.getDefaultSystemPrompt(input);
    messages.push({ role: "system", content: systemContent });

    // User message
    let userContent: string;
    if (prompt?.userPromptTemplate) {
      userContent = this.interpolateTemplate(prompt.userPromptTemplate, input);
    } else {
      userContent =
        typeof input === "string" ? input : JSON.stringify(input, null, 2);
    }
    messages.push({ role: "user", content: userContent });

    return messages;
  }

  private interpolateTemplate<TInput>(template: string, input: TInput): string {
    let result = template;
    if (typeof input === "object" && input !== null) {
      for (const [key, value] of Object.entries(input)) {
        const placeholder = `{${key}}`;
        result = result.replace(
          new RegExp(placeholder, "g"),
          String(value ?? ""),
        );
      }
    }
    return result;
  }

  private async callProvider(
    provider: AiProvider,
    options: ProviderCallOptions,
  ) {
    switch (provider) {
      case "openai":
        return this.openai.call(options);
      case "anthropic":
        return this.anthropic.call(options);
      case "perplexity":
        return this.perplexity.call(options);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private getFallbackModel(provider: AiProvider, task: AiTask): string {
    // Use cheaper/faster models for fallback
    switch (provider) {
      case "openai":
        return "gpt-4o-mini";
      case "anthropic":
        return "claude-3-haiku-20240307";
      case "perplexity":
        return "llama-3.1-sonar-small-128k-online";
      default:
        return "gpt-4o-mini";
    }
  }

  private getDefaultMaxTokens(task: AiTask): number {
    switch (task) {
      case "sms_classify":
        return 200;
      case "sms_generate":
        return 300;
      case "research_verify":
        return 500;
      case "research_deep":
        return 2000;
      case "meeting_brief":
        return 1000;
      default:
        return 500;
    }
  }

  private shouldUseJson(task: AiTask): boolean {
    return task === "sms_classify";
  }

  private getDefaultSystemPrompt<TInput>(input: TInput): string {
    return "You are a helpful AI assistant. Respond concisely and accurately.";
  }

  private parseOutput<TOutput>(content: string, task: AiTask): TOutput {
    // Try to parse as JSON for structured tasks
    if (this.shouldUseJson(task)) {
      try {
        return JSON.parse(content) as TOutput;
      } catch {
        this.logger.warn(`Failed to parse JSON output for task ${task}`);
      }
    }

    // Return raw content wrapped in expected structure
    return content as unknown as TOutput;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK & DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Health check for all AI providers
   * Returns circuit breaker state for each provider
   */
  async healthCheck(): Promise<
    Record<string, { status: string; latencyMs: number }>
  > {
    const results: Record<string, { status: string; latencyMs: number }> = {};

    for (const provider of ["openai", "anthropic", "perplexity"] as const) {
      const start = Date.now();
      try {
        const circuitState = this.circuitBreaker?.getState?.(provider);
        const state = circuitState?.state || "closed";
        results[provider] = {
          status:
            state === "open"
              ? "down"
              : state === "half-open"
                ? "degraded"
                : "ok",
          latencyMs: Date.now() - start,
        };
      } catch {
        results[provider] = {
          status: "unknown",
          latencyMs: Date.now() - start,
        };
      }
    }
    return results;
  }

  /**
   * Usage dashboard for a team
   * Returns aggregated stats for the specified period
   */
  async getUsageDashboard(
    teamId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    teamId: string;
    period: { start: Date; end: Date };
    totalTokens: number;
    totalCostUsd: number;
    requestCount: number;
    avgLatencyMs: number;
    byProvider: Record<
      string,
      { tokens: number; cost: number; requests: number }
    >;
    byTask: Record<string, number>;
  }> {
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const usage = await this.usageMeter.getUsageStats(teamId, start, end);
    return {
      teamId,
      period: { start, end },
      ...usage,
    };
  }
}
