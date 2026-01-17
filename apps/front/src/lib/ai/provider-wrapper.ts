/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AI PROVIDER WRAPPER - Unified hardening for all AI calls
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Wraps direct OpenAI/Anthropic calls with:
 * - Circuit breaker protection
 * - Timeout handling (30s)
 * - Retry with exponential backoff
 * - Usage tracking per tenant
 *
 * Use this for API routes that need custom prompts but still want hardening.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Logger } from "@/lib/logger";
import {
  openaiCircuit,
  anthropicCircuit,
  CircuitBreakerError,
} from "./circuit-breaker";
import { trackUsage, checkUsageLimits } from "./usage-tracker";

const CONFIG = {
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY_MS: 1000,
} as const;

export interface OpenAICallOptions {
  apiKey: string;
  model?: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: { type: string };
  teamId?: string;
  operation?: string;
}

export interface AnthropicCallOptions {
  apiKey: string;
  model?: string;
  system: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  teamId?: string;
  operation?: string;
}

export interface AICallResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  latencyMs: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
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

/**
 * Hardened OpenAI API call with circuit breaker, retry, and usage tracking
 */
export async function callOpenAIHardened(
  options: OpenAICallOptions
): Promise<AICallResult> {
  const {
    apiKey,
    model = "gpt-4o-mini",
    messages,
    maxTokens = 500,
    temperature = 0.7,
    responseFormat,
    teamId,
    operation = "unknown",
  } = options;

  if (!apiKey) {
    throw new Error("OpenAI API key not provided");
  }

  // Check usage limits if teamId provided
  if (teamId) {
    const limitCheck = await checkUsageLimits(teamId);
    if (!limitCheck.allowed) {
      Logger.warn("AI", "Usage limit exceeded", {
        teamId,
        reason: limitCheck.reason,
        operation,
      });
      throw new Error(`AI usage limit exceeded: ${limitCheck.reason}`);
    }
  }

  // Check circuit breaker
  if (!openaiCircuit.canExecute()) {
    throw new CircuitBreakerError(
      "OpenAI circuit breaker is OPEN. Service temporarily unavailable.",
      "openai",
      openaiCircuit.getStats().state
    );
  }

  let lastError: Error | null = null;
  let startTime = Date.now();

  for (let attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

    try {
      startTime = Date.now();

      const body: Record<string, unknown> = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      };

      if (responseFormat) {
        body.response_format = responseFormat;
      }

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      const usage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
          }
        : null;

      // Log and track usage
      Logger.info("AI", "OpenAI call completed", {
        operation,
        model,
        latencyMs,
        tokens: usage?.totalTokens,
      });

      if (teamId && usage) {
        trackUsage({
          teamId,
          provider: "openai",
          model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          latencyMs,
          success: true,
        }).catch(() => {});
      }

      openaiCircuit.recordSuccess();

      return {
        content: data.choices?.[0]?.message?.content || "",
        usage,
        latencyMs,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < CONFIG.MAX_RETRIES - 1 && isRetryableError(error)) {
        const delayMs = CONFIG.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        Logger.warn("AI", "OpenAI call failed, retrying", {
          operation,
          attempt: attempt + 1,
          delayMs,
          error: lastError.message,
        });
        await sleep(delayMs);
        continue;
      }

      Logger.error("AI", "OpenAI call failed", {
        operation,
        attempt: attempt + 1,
        error: lastError.message,
      });

      if (teamId) {
        trackUsage({
          teamId,
          provider: "openai",
          model,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: Date.now() - startTime,
          success: false,
        }).catch(() => {});
      }

      openaiCircuit.recordFailure(lastError);
      throw lastError;
    }
  }

  throw lastError || new Error("OpenAI call failed after retries");
}

/**
 * Hardened Anthropic API call with circuit breaker, retry, and usage tracking
 */
export async function callAnthropicHardened(
  options: AnthropicCallOptions
): Promise<AICallResult> {
  const {
    apiKey,
    model = "claude-3-haiku-20240307",
    system,
    messages,
    maxTokens = 500,
    temperature = 0.7,
    teamId,
    operation = "unknown",
  } = options;

  if (!apiKey) {
    throw new Error("Anthropic API key not provided");
  }

  // Check usage limits if teamId provided
  if (teamId) {
    const limitCheck = await checkUsageLimits(teamId);
    if (!limitCheck.allowed) {
      Logger.warn("AI", "Usage limit exceeded", {
        teamId,
        reason: limitCheck.reason,
        operation,
      });
      throw new Error(`AI usage limit exceeded: ${limitCheck.reason}`);
    }
  }

  // Check circuit breaker
  if (!anthropicCircuit.canExecute()) {
    throw new CircuitBreakerError(
      "Anthropic circuit breaker is OPEN. Service temporarily unavailable.",
      "anthropic",
      anthropicCircuit.getStats().state
    );
  }

  let lastError: Error | null = null;
  let startTime = Date.now();

  for (let attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

    try {
      startTime = Date.now();

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          system,
          messages,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Anthropic API error: ${response.status} - ${errorText}`
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
          }
        : null;

      // Log and track usage
      Logger.info("AI", "Anthropic call completed", {
        operation,
        model,
        latencyMs,
        tokens: usage?.totalTokens,
      });

      if (teamId && usage) {
        trackUsage({
          teamId,
          provider: "anthropic",
          model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          latencyMs,
          success: true,
        }).catch(() => {});
      }

      anthropicCircuit.recordSuccess();

      return {
        content: data.content?.[0]?.text || "",
        usage,
        latencyMs,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < CONFIG.MAX_RETRIES - 1 && isRetryableError(error)) {
        const delayMs = CONFIG.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        Logger.warn("AI", "Anthropic call failed, retrying", {
          operation,
          attempt: attempt + 1,
          delayMs,
          error: lastError.message,
        });
        await sleep(delayMs);
        continue;
      }

      Logger.error("AI", "Anthropic call failed", {
        operation,
        attempt: attempt + 1,
        error: lastError.message,
      });

      if (teamId) {
        trackUsage({
          teamId,
          provider: "anthropic",
          model,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: Date.now() - startTime,
          success: false,
        }).catch(() => {});
      }

      anthropicCircuit.recordFailure(lastError);
      throw lastError;
    }
  }

  throw lastError || new Error("Anthropic call failed after retries");
}
