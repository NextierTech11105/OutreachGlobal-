import { NextRequest, NextResponse } from "next/server";

// AI Reply Suggestion API - Uses OpenAI or Anthropic
// Co-pilot mode: Suggests replies for incoming SMS responses

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

interface SuggestReplyRequest {
  incomingMessage: string;
  leadName?: string;
  leadPhone?: string;
  propertyAddress?: string;
  campaignType?: string; // e.g., "real_estate", "b2b", "financial"
  previousMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  provider?: "openai" | "anthropic"; // Which AI to use
  tone?: "friendly" | "professional" | "urgent" | "casual";
  remixContext?: string; // Additional style/tone context from sliders
  sliders?: {
    conversational: number;
    humor: number;
    urgency: number;
    directness: number;
  };
  trainingData?: Array<{ incomingMessage: string; idealResponse: string }>;
}

// System prompts for different campaign types
const SYSTEM_PROMPTS: Record<string, string> = {
  real_estate: `You are an AI assistant helping a real estate investor respond to motivated seller leads.
Your goal is to:
1. Build rapport and show genuine interest
2. Qualify the lead (are they ready to sell?)
3. Schedule a call or property visit
4. Be helpful, not pushy

Keep responses SHORT (under 160 characters for SMS) and conversational.
Always aim to move the conversation forward toward a call or meeting.`,

  b2b: `You are an AI assistant helping with B2B outreach responses.
Your goal is to:
1. Address the prospect's question or concern
2. Highlight value proposition
3. Schedule a demo or call
4. Be professional but personable

Keep responses concise and action-oriented.`,

  financial: `You are an AI assistant helping with financial services outreach.
Your goal is to:
1. Address concerns professionally
2. Build trust and credibility
3. Schedule a consultation
4. Comply with financial regulations (no specific promises)

Keep responses professional and helpful.`,

  default: `You are an AI assistant helping respond to incoming SMS messages.
Keep responses SHORT (under 160 characters), friendly, and aim to continue the conversation.
Be helpful and move toward scheduling a call if appropriate.`,
};

// Tone modifiers
const TONE_MODIFIERS: Record<string, string> = {
  friendly: "Use a warm, friendly tone with casual language.",
  professional: "Use a professional, business-like tone.",
  urgent: "Convey urgency while remaining respectful.",
  casual: "Be very casual and conversational, like texting a friend.",
};

export async function POST(request: NextRequest) {
  try {
    const body: SuggestReplyRequest = await request.json();
    const {
      incomingMessage,
      leadName,
      propertyAddress,
      campaignType = "default",
      previousMessages = [],
      provider = "openai",
      tone = "friendly",
      remixContext,
      trainingData = [],
    } = body;

    if (!incomingMessage) {
      return NextResponse.json(
        { error: "incomingMessage is required" },
        { status: 400 }
      );
    }

    // Build context
    const systemPrompt = SYSTEM_PROMPTS[campaignType] || SYSTEM_PROMPTS.default;
    const toneModifier = TONE_MODIFIERS[tone] || TONE_MODIFIERS.friendly;

    const contextInfo = [
      leadName && `Lead name: ${leadName}`,
      propertyAddress && `Property: ${propertyAddress}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Build training examples section
    let trainingSection = "";
    if (trainingData.length > 0) {
      const examples = trainingData.slice(0, 10).map((ex, i) =>
        `Example ${i + 1}:\n  Lead says: "${ex.incomingMessage}"\n  You reply: "${ex.idealResponse}"`
      ).join("\n\n");
      trainingSection = `\n\nHere are some example responses to learn from:\n${examples}\n\nUse these as guidance for tone and style.`;
    }

    const remixInstructions = remixContext ? `\n\nIMPORTANT STYLE INSTRUCTIONS: ${remixContext}` : "";
    const fullSystemPrompt = `${systemPrompt}\n\n${toneModifier}\n\n${contextInfo ? `Context:\n${contextInfo}` : ""}${trainingSection}${remixInstructions}`;

    // Build messages array
    const messages = [
      ...previousMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: incomingMessage },
    ];

    let suggestedReply = "";
    let confidence = 0;
    let usedProvider = provider;

    // Try preferred provider first, fall back to other
    if (provider === "anthropic" && ANTHROPIC_API_KEY) {
      const result = await generateWithAnthropic(fullSystemPrompt, messages);
      suggestedReply = result.reply;
      confidence = result.confidence;
    } else if (provider === "openai" && OPENAI_API_KEY) {
      const result = await generateWithOpenAI(fullSystemPrompt, messages);
      suggestedReply = result.reply;
      confidence = result.confidence;
    } else if (OPENAI_API_KEY) {
      // Fallback to OpenAI
      const result = await generateWithOpenAI(fullSystemPrompt, messages);
      suggestedReply = result.reply;
      confidence = result.confidence;
      usedProvider = "openai";
    } else if (ANTHROPIC_API_KEY) {
      // Fallback to Anthropic
      const result = await generateWithAnthropic(fullSystemPrompt, messages);
      suggestedReply = result.reply;
      confidence = result.confidence;
      usedProvider = "anthropic";
    } else {
      return NextResponse.json(
        { error: "No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY." },
        { status: 503 }
      );
    }

    // Analyze the incoming message for classification hints
    const classification = classifyMessage(incomingMessage);

    return NextResponse.json({
      suggestedReply,
      confidence,
      provider: usedProvider,
      classification,
      characterCount: suggestedReply.length,
      isShortEnough: suggestedReply.length <= 160,
    });
  } catch (error) {
    console.error("[AI Suggest Reply] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate reply" },
      { status: 500 }
    );
  }
}

// OpenAI generation
async function generateWithOpenAI(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{ reply: string; confidence: number }> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 100,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content?.trim() || "";

  // Estimate confidence based on response quality
  const confidence = reply.length > 10 && reply.length <= 200 ? 85 : 70;

  return { reply, confidence };
}

// Anthropic generation
async function generateWithAnthropic(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{ reply: string; confidence: number }> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 100,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const reply = data.content?.[0]?.text?.trim() || "";

  // Estimate confidence based on response quality
  const confidence = reply.length > 10 && reply.length <= 200 ? 90 : 75;

  return { reply, confidence };
}

// Simple message classification
function classifyMessage(message: string): {
  intent: string;
  sentiment: string;
  action: string;
} {
  const lower = message.toLowerCase();

  // Intent detection
  let intent = "unknown";
  if (
    lower.includes("yes") ||
    lower.includes("interested") ||
    lower.includes("tell me more") ||
    lower.includes("how much")
  ) {
    intent = "interested";
  } else if (lower.includes("?") || lower.includes("what") || lower.includes("when") || lower.includes("how")) {
    intent = "question";
  } else if (lower.includes("stop") || lower.includes("unsubscribe") || lower.includes("remove")) {
    intent = "opt_out";
  } else if (lower.includes("no") || lower.includes("not interested") || lower.includes("don't")) {
    intent = "not_interested";
  } else if (lower.includes("call") || lower.includes("phone") || lower.includes("talk")) {
    intent = "wants_call";
  }

  // Sentiment detection
  let sentiment = "neutral";
  if (
    lower.includes("great") ||
    lower.includes("yes") ||
    lower.includes("perfect") ||
    lower.includes("thanks") ||
    lower.includes("interested")
  ) {
    sentiment = "positive";
  } else if (
    lower.includes("no") ||
    lower.includes("stop") ||
    lower.includes("don't") ||
    lower.includes("annoying") ||
    lower.includes("spam")
  ) {
    sentiment = "negative";
  }

  // Suggested action
  let action = "respond";
  if (intent === "opt_out") {
    action = "add_to_dnc";
  } else if (intent === "interested" || intent === "wants_call") {
    action = "escalate_to_call";
  } else if (intent === "not_interested") {
    action = "mark_cold";
  }

  return { intent, sentiment, action };
}

// GET - Check AI provider status
export async function GET() {
  return NextResponse.json({
    openai: {
      configured: !!OPENAI_API_KEY,
      model: "gpt-4o-mini",
    },
    anthropic: {
      configured: !!ANTHROPIC_API_KEY,
      model: "claude-3-haiku-20240307",
    },
    campaignTypes: Object.keys(SYSTEM_PROMPTS),
    tones: Object.keys(TONE_MODIFIERS),
  });
}
