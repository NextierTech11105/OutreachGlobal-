/**
 * Anthropic Provider Client
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
export class AnthropicClient {
  private readonly logger = new Logger(AnthropicClient.name);
  private readonly apiKey: string;
  private readonly config: ProviderConfig;

  constructor(
    private configService: ConfigService,
    private circuitBreaker: CircuitBreakerService,
  ) {
    this.apiKey = this.configService.get<string>("ANTHROPIC_API_KEY") || "";
    this.config = DEFAULT_CONFIG;

    // Configure circuit breaker for Anthropic
    this.circuitBreaker.configure("anthropic", {
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenSuccessThreshold: 2,
    });
  }

  async call(options: ProviderCallOptions): Promise<ProviderResponse> {
    if (!this.apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    return this.circuitBreaker.execute("anthropic", () =>
      this.executeWithRetry(options),
    );
  }

  private async executeWithRetry(
    options: ProviderCallOptions,
  ): Promise<ProviderResponse> {
    let lastError: Error | null = null;

    // Extract system message from messages array
    const systemMessage = options.messages.find((m) => m.role === "system");
    const nonSystemMessages = options.messages.filter((m) => m.role !== "system");

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout,
      );
      const startTime = Date.now();

      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: options.model,
            max_tokens: options.maxTokens || 500,
            temperature: options.temperature ?? 0.7,
            system: systemMessage?.content || "",
            messages: nonSystemMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Anthropic API error: ${response.status} - ${errorText}`,
          );
        }

        const data = await response.json();
        const latencyMs = Date.now() - startTime;

        const usage = data.usage
          ? {
              promptTokens: data.usage.input_tokens || 0,
              completionTokens: data.usage.output_tokens || 0,
              totalTokens:
                (data.usage.input_tokens || 0) +
                (data.usage.output_tokens || 0),
              costUsd: this.calculateCost(
                options.model,
                data.usage.input_tokens || 0,
                data.usage.output_tokens || 0,
              ),
            }
          : null;

        this.logger.debug(
          `Anthropic call completed: model=${options.model} latency=${latencyMs}ms tokens=${usage?.totalTokens}`,
        );

        return {
          content: data.content?.[0]?.text || "",
          usage,
          model: options.model,
          latencyMs,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.maxRetries - 1 && this.isRetryable(error)) {
          const delayMs =
            this.config.initialRetryDelay * Math.pow(2, attempt);
          this.logger.warn(
            `Anthropic call failed, retrying in ${delayMs}ms: ${lastError.message}`,
          );
          await this.sleep(delayMs);
          continue;
        }

        this.logger.error(
          `Anthropic call failed after ${attempt + 1} attempts: ${lastError.message}`,
        );
        throw lastError;
      }
    }

    throw lastError || new Error("Anthropic call failed after retries");
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
