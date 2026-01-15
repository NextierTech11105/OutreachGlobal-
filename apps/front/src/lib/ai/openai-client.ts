/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPENAI CLIENT - AI Copilot Core
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Powers the AI Copilot for:
 * - Message classification (POSITIVE, NEGATIVE, QUESTION, etc.)
 * - Priority assignment (HOT, WARM, COLD)
 * - Auto-response generation
 * - Intent extraction
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type Classification =
  | "POSITIVE"      // Interested, wants to talk
  | "NEGATIVE"      // Not interested, go away
  | "QUESTION"      // Asking for more info
  | "OBJECTION"     // Price, timing, trust concerns
  | "BOOKING"       // Wants to schedule
  | "RESCHEDULE"    // Change existing appointment
  | "STOP"          // Opt-out request
  | "SPAM"          // Irrelevant/spam
  | "UNCLEAR";      // Can't determine intent

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
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function callOpenAI(
  messages: OpenAIMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const {
    model = "gpt-4o-mini",
    temperature = 0.3,
    maxTokens = 500,
  } = options;

  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

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
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "{}";
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
  }
): Promise<ClassificationResult> {
  const contextInfo = context
    ? `\n\nCONTEXT:\n- Lead Name: ${context.leadName || "Unknown"}\n- Campaign: ${context.campaignType || "General"}\n- Previous messages: ${context.previousMessages?.slice(-3).join(" | ") || "None"}`
    : "";

  const messages: OpenAIMessage[] = [
    { role: "system", content: CLASSIFICATION_PROMPT + contextInfo },
    { role: "user", content: `Classify this inbound SMS:\n\n"${inboundMessage}"` },
  ];

  const result = await callOpenAI(messages, { temperature: 0.1 });

  try {
    const parsed = JSON.parse(result);
    return {
      classification: parsed.classification || "UNCLEAR",
      priority: parsed.priority || "COLD",
      confidence: parsed.confidence || 0.5,
      intent: parsed.intent || "Unable to determine intent",
      suggestedAction: parsed.suggestedAction || "Review manually",
      shouldAutoRespond: parsed.shouldAutoRespond ?? false,
      shouldRouteToCall: parsed.shouldRouteToCall ?? false,
    };
  } catch {
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
  }
): Promise<GeneratedResponse> {
  const contextInfo = `
LEAD CONTEXT:
- Name: ${context.leadName}
- Company: ${context.companyName || "Unknown"}
- Campaign: ${context.campaignContext || "General outreach"}
- Booking Link: ${context.calendlyLink || "calendly.com/tb-outreachglobal/15min"}

THEIR MESSAGE: "${inboundMessage}"
CLASSIFIED AS: ${classification.classification} (${classification.priority})
INTENT: ${classification.intent}
`;

  const messages: OpenAIMessage[] = [
    { role: "system", content: RESPONSE_GENERATION_PROMPT + contextInfo },
    {
      role: "user",
      content: `Generate a response for this ${classification.classification} message. Remember: MAX 160 chars, conversational, end with CTA.`
    },
  ];

  const result = await callOpenAI(messages, { temperature: 0.7 });

  try {
    const parsed = JSON.parse(result);
    const message = parsed.message || "";
    return {
      message,
      tone: parsed.tone || "friendly",
      charCount: message.length,
      isCompliant: message.length <= 160,
    };
  } catch {
    return {
      message: `Hi ${context.leadName}, thanks for getting back to me! Would love to chat - when works for a quick call? -Emily`,
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
  message: string
): Promise<{ classification: Classification; priority: Priority }> {
  // Fast keyword-based classification for obvious cases
  const lowerMessage = message.toLowerCase().trim();

  // STOP signals - immediate opt-out
  if (/\b(stop|unsubscribe|remove|opt.?out|quit)\b/i.test(lowerMessage)) {
    return { classification: "STOP", priority: "HOT" };
  }

  // POSITIVE signals
  if (/\b(yes|interested|tell me more|sounds good|let'?s talk|call me|sure)\b/i.test(lowerMessage)) {
    return { classification: "POSITIVE", priority: "HOT" };
  }

  // BOOKING signals
  if (/\b(schedule|appointment|calendar|meet|when|available|book|set up)\b/i.test(lowerMessage)) {
    return { classification: "BOOKING", priority: "HOT" };
  }

  // NEGATIVE signals
  if (/\b(no|not interested|don'?t|stop|remove|wrong number|go away)\b/i.test(lowerMessage)) {
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
  messages: Array<{ id: string; message: string }>
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
      { role: "system", content: "Reply with JSON: {\"status\": \"ok\"}" },
      { role: "user", content: "Health check" },
    ];

    await callOpenAI(messages, { maxTokens: 20 });

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

console.log("[OpenAI Client] Loaded - AI Copilot ready");
