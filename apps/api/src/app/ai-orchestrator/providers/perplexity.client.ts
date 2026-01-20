/**
 * Perplexity Provider Client
 * Hardened with timeout, retry, circuit breaker integration
 * Used for real-time web search and research tasks
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CircuitBreakerService } from "@/lib/circuit-breaker";
import {
  ProviderCallOptions,
  ProviderResponse,
  ProviderConfig,
  MODEL_PRICING,
} from "./provider.types";

const DEFAULT_CONFIG: ProviderConfig = {
  timeout: 45000, // Longer timeout for web search
  maxRetries: 2, // Fewer retries - research can be expensive
  initialRetryDelay: 2000,
};

@Injectable()
export class PerplexityClient {
  private readonly logger = new Logger(PerplexityClient.name);
  private readonly apiKey: string;
  private readonly config: ProviderConfig;

  constructor(
    private configService: ConfigService,
    private circuitBreaker: CircuitBreakerService,
  ) {
    this.apiKey = this.configService.get<string>("PERPLEXITY_API_KEY") || "";
    this.config = DEFAULT_CONFIG;

    // Configure circuit breaker for Perplexity
    this.circuitBreaker.configure("perplexity", {
      failureThreshold: 3, // Lower threshold - faster failover
      resetTimeout: 60000, // Longer reset - web search can be flaky
      halfOpenSuccessThreshold: 1,
    });
  }

  async call(options: ProviderCallOptions): Promise<ProviderResponse> {
    if (!this.apiKey) {
      throw new Error("Perplexity API key not configured");
    }

    return this.circuitBreaker.execute("perplexity", () =>
      this.executeWithRetry(options),
    );
  }

  private async executeWithRetry(
    options: ProviderCallOptions,
  ): Promise<ProviderResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout,
      );
      const startTime = Date.now();

      try {
        const response = await fetch(
          "https://api.perplexity.ai/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model: options.model,
              messages: options.messages,
              max_tokens: options.maxTokens || 1000, // Research needs more tokens
              temperature: options.temperature ?? 0.2, // Lower temp for accuracy
            }),
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Perplexity API error: ${response.status} - ${errorText}`,
          );
        }

        const data = await response.json();
        const latencyMs = Date.now() - startTime;

        const usage = data.usage
          ? {
              promptTokens: data.usage.prompt_tokens || 0,
              completionTokens: data.usage.completion_tokens || 0,
              totalTokens: data.usage.total_tokens || 0,
              costUsd: this.calculateCost(
                options.model,
                data.usage.prompt_tokens || 0,
                data.usage.completion_tokens || 0,
              ),
            }
          : null;

        this.logger.debug(
          `Perplexity call completed: model=${options.model} latency=${latencyMs}ms tokens=${usage?.totalTokens}`,
        );

        return {
          content: data.choices?.[0]?.message?.content || "",
          usage,
          model: options.model,
          latencyMs,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.maxRetries - 1 && this.isRetryable(error)) {
          const delayMs = this.config.initialRetryDelay * Math.pow(2, attempt);
          this.logger.warn(
            `Perplexity call failed, retrying in ${delayMs}ms: ${lastError.message}`,
          );
          await this.sleep(delayMs);
          continue;
        }

        this.logger.error(
          `Perplexity call failed after ${attempt + 1} attempts: ${lastError.message}`,
        );
        throw lastError;
      }
    }

    throw lastError || new Error("Perplexity call failed after retries");
  }

  private calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) return 0;

    // Perplexity has per-request pricing
    let cost = pricing.perRequest || 0;

    // Plus token-based pricing
    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (completionTokens / 1_000_000) * pricing.output;
    cost += inputCost + outputCost;

    return cost;
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("rate limit") ||
        message.includes("429") ||
        message.includes("500") ||
        message.includes("502") ||
        message.includes("503") ||
        message.includes("504") ||
        message.includes("timeout") ||
        message.includes("aborted")
      );
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
