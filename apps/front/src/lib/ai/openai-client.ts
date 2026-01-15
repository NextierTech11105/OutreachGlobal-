/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPENAI CLIENT - AI Copilot Core (HARDENED)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Powers the AI Copilot for:
 * - Message classification (POSITIVE, NEGATIVE, QUESTION, etc.)
 * - Priority assignment (HOT, WARM, COLD)
 * - Auto-response generation
 * - Intent extraction
 *
 * SECURITY HARDENING (P0):
 * - 30s timeout on all API calls (AbortController)
 * - Input sanitization to prevent prompt injection
 * - Zod schema validation for AI outputs
 * - Token usage logging for cost tracking
 * - Retry with exponential backoff
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import { Logger } from "@/lib/logger";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TIMEOUT_MS: 30000, // 30 second timeout
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY_MS: 1000,
  MAX_INPUT_LENGTH: 2000,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type Classification =
  | "POSITIVE" // Interested, wants to talk
  | "NEGATIVE" // Not interested, go away
  | "QUESTION" // Asking for more info
  | "OBJECTION" // Price, timing, trust concerns
  | "BOOKING" // Wants to schedule
  | "RESCHEDULE" // Change existing appointment
  | "STOP" // Opt-out request
  | "SPAM" // Irrelevant/spam
  | "UNCLEAR"; // Can't determine intent

export type Priority = "HOT" | "WARM" | "COLD";

export interface ClassificationResult {
  classification: Classification;
  priority: Priority;
  confidence: number;
  intent: string;
  suggestedAction: string;
  shouldAutoRespond: boolean;
  shouldRouteToCall: boolean;
}

export interface GeneratedResponse {
  message: string;
  tone: "professional" | "friendly" | "direct" | "empathetic";
  charCount: number;
  isCompliant: boolean;
}

export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS - Output Validation
// ═══════════════════════════════════════════════════════════════════════════════

const ClassificationSchema = z.object({
  classification: z.enum([
    "POSITIVE",
    "NEGATIVE",
    "QUESTION",
    "OBJECTION",
    "BOOKING",
    "RESCHEDULE",
    "STOP",
    "SPAM",
    "UNCLEAR",
  ]),
  priority: z.enum(["HOT", "WARM", "COLD"]),
  confidence: z.number().min(0).max(1),
  intent: z.string().max(500),
  suggestedAction: z.string().max(500),
  shouldAutoRespond: z.boolean(),
  shouldRouteToCall: z.boolean(),
});

const ResponseSchema = z.object({
  message: z.string().max(500),
  tone: z.enum(["professional", "friendly", "direct", "empathetic"]),
  charCount: z.number().optional(),
  isCompliant: z.boolean().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT SANITIZATION - Prompt Injection Prevention
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sanitize user input to prevent prompt injection attacks
 */
function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  let sanitized = input;

  // Truncate to max length
  if (sanitized.length > CONFIG.MAX_INPUT_LENGTH) {
    sanitized = sanitized.slice(0, CONFIG.MAX_INPUT_LENGTH);
    Logger.warn("AI", "Input truncated to max length", {
      originalLength: input.length,
      maxLength: CONFIG.MAX_INPUT_LENGTH,
    });
  }

  // Remove potential prompt injection patterns
  const dangerousPatterns = [
    /ignore (all )?(previous|prior|above) (instructions|prompts?|commands?)/gi,
    /disregard (all )?(previous|prior|above)/gi,
    /new instructions?:/gi,
    /system prompt:/gi,
    /\[INST\]/gi,
    /<<SYS>>/gi,
    /<\|im_start\|>/gi,
    /```(system|assistant)/gi,
    /role:\s*(system|assistant)/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      Logger.warn("AI", "Potential prompt injection detected", {
        pattern: pattern.source,
        inputPreview: sanitized.slice(0, 100),
      });
      sanitized = sanitized.replace(pattern, "[FILTERED]");
    }
  }

  // Escape special characters that could break JSON
  sanitized = sanitized
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\t/g, " ");

  return sanitized.trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPTS - The brain of the AI Copilot
// ═══════════════════════════════════════════════════════════════════════════════

const CLASSIFICATION_PROMPT = `You are an AI assistant for a B2B sales platform. Your job is to classify inbound SMS responses.

CLASSIFICATION CATEGORIES:
- POSITIVE: Shows interest, wants to learn more, asks about pricing, mentions a problem they have
- NEGATIVE: Explicitly not interested, rude responses, "no thanks", "not interested"
- QUESTION: Asking for more information, "who is this?", "what do you offer?"
- OBJECTION: Price concerns, timing issues, "too busy", "maybe later", trust concerns
- BOOKING: Wants to schedule a call/meeting, "when can we talk?", "let's set up a time"
- RESCHEDULE: Has existing appointment, wants to change it
- STOP: Opt-out request, "stop", "unsubscribe", "remove me"
- SPAM: Irrelevant response, promotional content, wrong number
- UNCLEAR: Cannot determine intent from message

PRIORITY LEVELS:
- HOT: Ready to talk NOW, booking request, strong positive signals
- WARM: Interested but not urgent, questions, soft objections
- COLD: Not interested right now, hard objections, unclear

For each message, respond with ONLY valid JSON:
{
  "classification": "CATEGORY",
  "priority": "HOT|WARM|COLD",
  "confidence": 0.0-1.0,
  "intent": "one sentence summary of their intent",
  "suggestedAction": "what should we do next",
  "shouldAutoRespond": true/false,
  "shouldRouteToCall": true/false
}`;

const RESPONSE_GENERATION_PROMPT = `You are Emily, an AI sales assistant. Generate conversational SMS responses that are:

RULES:
1. MAX 160 characters (single SMS segment)
2. Conversational and human-like, NOT robotic or salesy
3. Match the tone of their message
4. Always end with a soft call-to-action
5. Never be pushy or aggressive
6. If they're interested, push toward a quick call
7. If they have objections, acknowledge and address briefly

RESPONSE TONE GUIDE:
- POSITIVE responses: Be enthusiastic but professional, push for call
- QUESTIONS: Answer briefly, offer more detail on a call
- OBJECTIONS: Acknowledge, provide value, leave door open
- BOOKING: Confirm and provide scheduling link or time options

Respond with ONLY valid JSON:
{
  "message": "your 160-char max response",
  "tone": "professional|friendly|direct|empathetic",
  "charCount": number,
  "isCompliant": true
}`;

// ═══════════════════════════════════════════════════════════════════════════════
// RETRY LOGIC - Exponential Backoff
// ═══════════════════════════════════════════════════════════════════════════════

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Retry on rate limits, server errors, and timeouts
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

// ═══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function callOpenAI(
  messages: OpenAIMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    operation?: string;
  } = {},
): Promise<{ content: string; usage: TokenUsage | null }> {
  const {
    model = "gpt-4o-mini",
    temperature = 0.3,
    maxTokens = 500,
    operation = "unknown",
  } = options;

  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

    try {
      const startTime = Date.now();

      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      // Extract token usage
      const usage: TokenUsage | null = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
          }
        : null;

      // Log token usage for cost tracking
      if (usage) {
        Logger.info("AI", "OpenAI call completed", {
          operation,
          model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          latencyMs,
          attempt: attempt + 1,
        });
      }

      return {
        content: data.choices[0]?.message?.content || "{}",
        usage,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt < CONFIG.MAX_RETRIES - 1 && isRetryableError(error)) {
        const delayMs =
          CONFIG.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        Logger.warn("AI", "OpenAI call failed, retrying", {
          operation,
          attempt: attempt + 1,
          maxRetries: CONFIG.MAX_RETRIES,
          delayMs,
          error: lastError.message,
        });
        await sleep(delayMs);
        continue;
      }

      // Log final failure
      Logger.error("AI", "OpenAI call failed", {
        operation,
        attempt: attempt + 1,
        error: lastError.message,
      });
      throw lastError;
    }
  }

  throw lastError || new Error("OpenAI call failed after retries");
}

/**
 * Classify an inbound SMS message
 */
export async function classifyMessage(
  inboundMessage: string,
  context?: {
    leadName?: string;
    previousMessages?: string[];
    campaignType?: string;
  },
): Promise<ClassificationResult> {
  // SECURITY: Sanitize input to prevent prompt injection
  const sanitizedMessage = sanitizeInput(inboundMessage);
  const sanitizedLeadName = context?.leadName
    ? sanitizeInput(context.leadName)
    : "Unknown";
  const sanitizedCampaign = context?.campaignType
    ? sanitizeInput(context.campaignType)
    : "General";
  const sanitizedPrevious = context?.previousMessages
    ?.slice(-3)
    .map((m) => sanitizeInput(m))
    .join(" | ");

  const contextInfo = context
    ? `\n\nCONTEXT:\n- Lead Name: ${sanitizedLeadName}\n- Campaign: ${sanitizedCampaign}\n- Previous messages: ${sanitizedPrevious || "None"}`
    : "";

  const messages: OpenAIMessage[] = [
    { role: "system", content: CLASSIFICATION_PROMPT + contextInfo },
    {
      role: "user",
      content: `Classify this inbound SMS:\n\n"${sanitizedMessage}"`,
    },
  ];

  const { content } = await callOpenAI(messages, {
    temperature: 0.1,
    operation: "classifyMessage",
  });

  try {
    const parsed = JSON.parse(content);

    // SECURITY: Validate output with Zod schema
    const validated = ClassificationSchema.safeParse(parsed);

    if (validated.success) {
      return validated.data;
    }

    // Log validation failure but return best-effort result
    Logger.warn("AI", "Classification output validation failed", {
      errors: validated.error.errors,
      rawOutput: content.slice(0, 200),
    });

    return {
      classification: parsed.classification || "UNCLEAR",
      priority: parsed.priority || "COLD",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      intent: typeof parsed.intent === "string" ? parsed.intent : "Unable to determine intent",
      suggestedAction: typeof parsed.suggestedAction === "string" ? parsed.suggestedAction : "Review manually",
      shouldAutoRespond: typeof parsed.shouldAutoRespond === "boolean" ? parsed.shouldAutoRespond : false,
      shouldRouteToCall: typeof parsed.shouldRouteToCall === "boolean" ? parsed.shouldRouteToCall : false,
    };
  } catch (parseError) {
    Logger.error("AI", "Failed to parse classification result", {
      error: parseError instanceof Error ? parseError.message : "Unknown",
      rawOutput: content.slice(0, 200),
    });

    return {
      classification: "UNCLEAR",
      priority: "COLD",
      confidence: 0,
      intent: "Failed to classify",
      suggestedAction: "Review manually",
      shouldAutoRespond: false,
      shouldRouteToCall: false,
    };
  }
}

/**
 * Generate an AI response to an inbound message
 */
export async function generateResponse(
  inboundMessage: string,
  classification: ClassificationResult,
  context: {
    leadName: string;
    companyName?: string;
    campaignContext?: string;
    calendlyLink?: string;
  },
): Promise<GeneratedResponse> {
  // SECURITY: Sanitize all inputs
  const sanitizedMessage = sanitizeInput(inboundMessage);
  const sanitizedLeadName = sanitizeInput(context.leadName);
  const sanitizedCompany = context.companyName
    ? sanitizeInput(context.companyName)
    : "Unknown";
  const sanitizedCampaign = context.campaignContext
    ? sanitizeInput(context.campaignContext)
    : "General outreach";

  const contextInfo = `
LEAD CONTEXT:
- Name: ${sanitizedLeadName}
- Company: ${sanitizedCompany}
- Campaign: ${sanitizedCampaign}
- Booking Link: ${context.calendlyLink || "calendly.com/tb-outreachglobal/15min"}

THEIR MESSAGE: "${sanitizedMessage}"
CLASSIFIED AS: ${classification.classification} (${classification.priority})
INTENT: ${sanitizeInput(classification.intent)}
`;

  const messages: OpenAIMessage[] = [
    { role: "system", content: RESPONSE_GENERATION_PROMPT + contextInfo },
    {
      role: "user",
      content: `Generate a response for this ${classification.classification} message. Remember: MAX 160 chars, conversational, end with CTA.`,
    },
  ];

  const { content } = await callOpenAI(messages, {
    temperature: 0.7,
    operation: "generateResponse",
  });

  try {
    const parsed = JSON.parse(content);

    // SECURITY: Validate output with Zod schema
    const validated = ResponseSchema.safeParse(parsed);

    if (validated.success) {
      const message = validated.data.message;
      return {
        message,
        tone: validated.data.tone,
        charCount: message.length,
        isCompliant: message.length <= 160,
      };
    }

    // Fallback with type checking
    const message = typeof parsed.message === "string" ? parsed.message : "";
    return {
      message,
      tone: ["professional", "friendly", "direct", "empathetic"].includes(parsed.tone)
        ? parsed.tone
        : "friendly",
      charCount: message.length,
      isCompliant: message.length <= 160,
    };
  } catch {
    return {
      message: `Hi ${sanitizedLeadName}, thanks for getting back to me! Would love to chat - when works for a quick call? -Emily`,
      tone: "friendly",
      charCount: 95,
      isCompliant: true,
    };
  }
}

/**
 * Quick classification for high-volume processing
 */
export async function quickClassify(
  message: string,
): Promise<{ classification: Classification; priority: Priority }> {
  // Fast keyword-based classification for obvious cases
  const lowerMessage = message.toLowerCase().trim();

  // STOP signals - immediate opt-out
  if (/\b(stop|unsubscribe|remove|opt.?out|quit)\b/i.test(lowerMessage)) {
    return { classification: "STOP", priority: "HOT" };
  }

  // POSITIVE signals
  if (
    /\b(yes|interested|tell me more|sounds good|let'?s talk|call me|sure)\b/i.test(
      lowerMessage,
    )
  ) {
    return { classification: "POSITIVE", priority: "HOT" };
  }

  // BOOKING signals
  if (
    /\b(schedule|appointment|calendar|meet|when|available|book|set up)\b/i.test(
      lowerMessage,
    )
  ) {
    return { classification: "BOOKING", priority: "HOT" };
  }

  // NEGATIVE signals
  if (
    /\b(no|not interested|don'?t|stop|remove|wrong number|go away)\b/i.test(
      lowerMessage,
    )
  ) {
    return { classification: "NEGATIVE", priority: "COLD" };
  }

  // QUESTION signals
  if (/\?|who is this|what|how|why|where/i.test(lowerMessage)) {
    return { classification: "QUESTION", priority: "WARM" };
  }

  // Default to AI classification for unclear cases
  const result = await classifyMessage(message);
  return {
    classification: result.classification,
    priority: result.priority,
  };
}

/**
 * Batch classify multiple messages
 */
export async function batchClassify(
  messages: Array<{ id: string; message: string }>,
): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();

  // Process in parallel batches of 5
  const batchSize = 5;
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const promises = batch.map(async (item) => {
      const result = await classifyMessage(item.message);
      results.set(item.id, result);
    });
    await Promise.all(promises);
  }

  return results;
}

/**
 * Check if OpenAI is configured and working
 */
export async function checkOpenAIHealth(): Promise<{
  configured: boolean;
  working: boolean;
  model: string;
  error?: string;
}> {
  if (!OPENAI_API_KEY) {
    return {
      configured: false,
      working: false,
      model: "gpt-4o-mini",
      error: "OPENAI_API_KEY not set",
    };
  }

  try {
    const messages: OpenAIMessage[] = [
      { role: "system", content: 'Reply with JSON: {"status": "ok"}' },
      { role: "user", content: "Health check" },
    ];

    await callOpenAI(messages, { maxTokens: 20, operation: "healthCheck" });

    return {
      configured: true,
      working: true,
      model: "gpt-4o-mini",
    };
  } catch (error) {
    return {
      configured: true,
      working: false,
      model: "gpt-4o-mini",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

Logger.info("AI", "OpenAI Client loaded - Hardened AI Copilot ready");
