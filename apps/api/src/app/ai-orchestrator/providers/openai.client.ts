/**
 * OpenAI Provider Client
 * Hardened with timeout, retry, circuit breaker integration
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
  timeout: 30000,
  maxRetries: 3,
  initialRetryDelay: 1000,
};

@Injectable()
export class OpenAIClient {
  private readonly logger = new Logger(OpenAIClient.name);
  private readonly apiKey: string;
  private readonly config: ProviderConfig;

  constructor(
    private configService: ConfigService,
    private circuitBreaker: CircuitBreakerService,
  ) {
    this.apiKey = this.configService.get<string>("OPENAI_API_KEY") || "";
    this.config = DEFAULT_CONFIG;

    // Configure circuit breaker for OpenAI
    this.circuitBreaker.configure("openai", {
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenSuccessThreshold: 2,
    });
  }

  async call(options: ProviderCallOptions): Promise<ProviderResponse> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    return this.circuitBreaker.execute("openai", () =>
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
        const body: Record<string, unknown> = {
          model: options.model,
          messages: options.messages,
          max_tokens: options.maxTokens || 500,
          temperature: options.temperature ?? 0.7,
        };

        if (options.responseFormat) {
          body.response_format = options.responseFormat;
        }

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `OpenAI API error: ${response.status} - ${errorText}`,
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
          `OpenAI call completed: model=${options.model} latency=${latencyMs}ms tokens=${usage?.totalTokens}`,
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
            `OpenAI call failed, retrying in ${delayMs}ms: ${lastError.message}`,
          );
          await this.sleep(delayMs);
          continue;
        }

        this.logger.error(
          `OpenAI call failed after ${attempt + 1} attempts: ${lastError.message}`,
        );
        throw lastError;
      }
    }

    throw lastError || new Error("OpenAI call failed after retries");
  }

  private calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) return 0;

    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (completionTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
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
