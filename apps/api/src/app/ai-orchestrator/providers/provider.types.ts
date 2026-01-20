/**
 * AI Provider Types
 * Core interfaces for the unified AI orchestrator
 */

export type AiProvider = "openai" | "anthropic" | "perplexity";

export type AiTask =
  | "sms_classify"
  | "sms_generate"
  | "research_verify"
  | "research_deep"
  | "meeting_brief";

export type AiPriority = "interactive" | "background";

export interface AiContext {
  teamId: string;
  userId?: string;
  leadId?: string;
  conversationId?: string;
  traceId: string;
  channel: "sms" | "web" | "system";
}

export interface OrchestratorRequest<TInput = unknown> {
  task: AiTask;
  priority: AiPriority;
  context: AiContext;
  input: TInput;
  promptKey?: string;
  idempotencyKey?: string;
  maxLatencyMs?: number;
  maxCostUsd?: number;
}

export interface OrchestratorResult<TOutput = unknown> {
  output: TOutput;
  provider: AiProvider;
  model: string;
  degraded: boolean;
  usage?: AiUsage;
  traceId: string;
  latencyMs: number;
}

export interface AiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface ProviderConfig {
  timeout: number;
  maxRetries: number;
  initialRetryDelay: number;
}

export interface ProviderResponse {
  content: string;
  usage: AiUsage | null;
  model: string;
  latencyMs: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderCallOptions {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  responseFormat?: { type: "json_object" | "text" };
}

// Model pricing per 1M tokens (USD)
export const MODEL_PRICING: Record<
  string,
  { input: number; output: number; perRequest?: number }
> = {
  // OpenAI
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  // Anthropic
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  "claude-3-sonnet-20240229": { input: 3.0, output: 15.0 },
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
  // Perplexity (per request pricing + token)
  "llama-3.1-sonar-small-128k-online": {
    input: 0.2,
    output: 0.2,
    perRequest: 0.005,
  },
  "llama-3.1-sonar-large-128k-online": {
    input: 1.0,
    output: 1.0,
    perRequest: 0.005,
  },
};

// Task -> Default model mapping
export const TASK_MODEL_MAP: Record<
  AiTask,
  { provider: AiProvider; model: string }
> = {
  sms_classify: { provider: "openai", model: "gpt-4o-mini" },
  sms_generate: { provider: "openai", model: "gpt-4o-mini" },
  research_verify: {
    provider: "perplexity",
    model: "llama-3.1-sonar-small-128k-online",
  },
  research_deep: {
    provider: "perplexity",
    model: "llama-3.1-sonar-small-128k-online",
  },
  meeting_brief: { provider: "anthropic", model: "claude-3-haiku-20240307" },
};

// Fallback chains
export const FALLBACK_CHAINS: Record<AiProvider, AiProvider[]> = {
  openai: ["anthropic"],
  anthropic: ["openai"],
  perplexity: ["openai"], // Perplexity fails -> fall back to OpenAI for non-realtime
};
