import { NextRequest, NextResponse } from "next/server";
import {
  GIANNA_IDENTITY,
  GIANNA_PRESETS,
  RESPONSE_STRATEGIES,
  OBJECTION_RESPONSES,
  LEAD_TYPE_APPROACHES,
  MESSAGE_RULES,
  personalityToPrompt,
  detectObjection,
  type GiannaPersonality,
} from "@/lib/gianna/knowledge-base";

// =============================================================================
// GIANNA AI RESPONSE ENGINE
// The Ultimate Digital SDR - Trained by Real Gianna, Scaled by AI
// =============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

interface SuggestReplyRequest {
  incomingMessage: string;
  leadName?: string;
  leadPhone?: string;
  propertyAddress?: string;
  businessName?: string;
  campaignType?: string; // e.g., "real_estate", "b2b", "business_valuation"
  leadType?: string; // e.g., "pre_foreclosure", "absentee_owner", "tired_landlord"
  previousMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  provider?: "openai" | "anthropic";

  // Personality configuration (0-100 for each)
  personality?: Partial<GiannaPersonality>;
  preset?: keyof typeof GIANNA_PRESETS; // Use a preset instead of manual sliders

  // Legacy support
  tone?: "friendly" | "professional" | "urgent" | "casual";
  remixContext?: string;
  sliders?: {
    conversational: number;
    humor: number;
    urgency: number;
    directness: number;
  };
  trainingData?: Array<{ incomingMessage: string; idealResponse: string }>;
}

/**
 * Build Gianna's full system prompt with personality and knowledge
 */
function buildGiannaSystemPrompt(
  personality: GiannaPersonality,
  context: {
    leadName?: string;
    propertyAddress?: string;
    businessName?: string;
    campaignType?: string;
    leadType?: string;
    detectedObjection?: string | null;
    detectedIntent?: string;
    trainingData?: Array<{ incomingMessage: string; idealResponse: string }>;
  }
): string {
  const sections: string[] = [];

  // === IDENTITY ===
  sections.push(`You are ${GIANNA_IDENTITY.name}, ${GIANNA_IDENTITY.role} for ${GIANNA_IDENTITY.company}.`);

  // === CORE PRINCIPLES ===
  sections.push(`
CORE PRINCIPLES (NEVER VIOLATE):
${GIANNA_IDENTITY.principles.map((p) => `- ${p}`).join("\n")}

NEVER DO:
${GIANNA_IDENTITY.neverDo.map((n) => `- ${n}`).join("\n")}
`);

  // === PERSONALITY INSTRUCTIONS ===
  const personalityInstructions = personalityToPrompt(personality);
  if (personalityInstructions) {
    sections.push(`\nPERSONALITY FOR THIS RESPONSE:\n${personalityInstructions}`);
  }

  // === CONTEXT ===
  const contextParts: string[] = [];
  if (context.leadName) contextParts.push(`Lead name: ${context.leadName}`);
  if (context.businessName) contextParts.push(`Business: ${context.businessName}`);
  if (context.propertyAddress) contextParts.push(`Property: ${context.propertyAddress}`);

  if (contextParts.length > 0) {
    sections.push(`\nCURRENT CONTEXT:\n${contextParts.join("\n")}`);
  }

  // === LEAD TYPE SPECIFIC APPROACH ===
  if (context.leadType && LEAD_TYPE_APPROACHES[context.leadType as keyof typeof LEAD_TYPE_APPROACHES]) {
    const approach = LEAD_TYPE_APPROACHES[context.leadType as keyof typeof LEAD_TYPE_APPROACHES];
    sections.push(`
LEAD TYPE: ${context.leadType.replace(/_/g, " ").toUpperCase()}
Tone: ${approach.tone}
Avoid: ${approach.avoid}
Approach: ${approach.approach}
`);
  }

  // === OBJECTION HANDLING ===
  if (context.detectedObjection && OBJECTION_RESPONSES[context.detectedObjection as keyof typeof OBJECTION_RESPONSES]) {
    const objection = OBJECTION_RESPONSES[context.detectedObjection as keyof typeof OBJECTION_RESPONSES];
    sections.push(`
OBJECTION DETECTED: ${context.detectedObjection.replace(/_/g, " ").toUpperCase()}
Example responses you can adapt:
${objection.responses.map((r) => `- "${r}"`).join("\n")}
`);
  }

  // === RESPONSE STRATEGY ===
  if (context.detectedIntent && RESPONSE_STRATEGIES[context.detectedIntent as keyof typeof RESPONSE_STRATEGIES]) {
    const strategy = RESPONSE_STRATEGIES[context.detectedIntent as keyof typeof RESPONSE_STRATEGIES];
    sections.push(`
INTENT DETECTED: ${context.detectedIntent.toUpperCase()}
Goal: ${strategy.goal}
Approach: ${strategy.approach}
${"examples" in strategy && strategy.examples ? `Examples:\n${strategy.examples.map((e: string) => `- "${e}"`).join("\n")}` : ""}
`);
  }

  // === TRAINING DATA ===
  if (context.trainingData && context.trainingData.length > 0) {
    const examples = context.trainingData.slice(0, 5).map(
      (ex, i) => `${i + 1}. Lead: "${ex.incomingMessage}" → You: "${ex.idealResponse}"`
    );
    sections.push(`
LEARN FROM THESE EXAMPLES (match this style):
${examples.join("\n")}
`);
  }

  // === MESSAGE RULES ===
  sections.push(`
RESPONSE RULES:
- Keep under ${MESSAGE_RULES.sms.idealLength} characters (max ${MESSAGE_RULES.sms.maxLength})
- Always end with a question or clear next step
- Use their name when natural
- Sound like a real person texting, not a bot
- Use "${GIANNA_IDENTITY.voice.greeting}" to start if appropriate, not "Hello" or "Hi there"
`);

  return sections.join("\n");
}

/**
 * Enhanced message classification with objection detection
 */
function classifyMessage(message: string): {
  intent: string;
  sentiment: string;
  action: string;
  objection: string | null;
  confidence: number;
} {
  const lower = message.toLowerCase();

  // Detect objection first
  const objection = detectObjection(message);

  // Intent detection (more granular)
  let intent = "unknown";
  let confidence = 50;

  // Strong positive signals
  if (lower.match(/\b(yes|yeah|yep|sure|definitely|absolutely|sounds good|i'm interested|tell me more)\b/)) {
    intent = "interested";
    confidence = 90;
  }
  // Wants more info
  else if (lower.match(/\b(how much|what's the|send me|email me|more info|details)\b/)) {
    intent = "more_info";
    confidence = 85;
  }
  // Wants a call
  else if (lower.match(/\b(call me|give me a call|let's talk|phone|can we talk)\b/)) {
    intent = "wants_call";
    confidence = 95;
  }
  // Questions
  else if (lower.includes("?") || lower.match(/\b(what|when|where|why|how|who)\b/)) {
    intent = "question";
    confidence = 75;
  }
  // Opt out (highest priority)
  else if (lower.match(/\b(stop|unsubscribe|remove|opt out|take me off|don't text|don't contact)\b/)) {
    intent = "opt_out";
    confidence = 99;
  }
  // Soft no
  else if (lower.match(/\b(not right now|maybe later|bad timing|not interested right now)\b/)) {
    intent = "soft_no";
    confidence = 80;
  }
  // Hard no
  else if (lower.match(/\b(no|not interested|don't want|leave me alone|f\*\*k off)\b/) && !lower.includes("?")) {
    intent = "hard_no";
    confidence = 85;
  }

  // Sentiment detection
  let sentiment = "neutral";
  if (lower.match(/\b(great|awesome|perfect|thanks|thank you|appreciate|excited|love)\b/)) {
    sentiment = "positive";
  } else if (lower.match(/\b(annoying|spam|scam|stop|hate|angry|pissed|wtf)\b/)) {
    sentiment = "negative";
  }

  // Suggested action
  let action = "respond";
  if (intent === "opt_out") {
    action = "add_to_dnc";
  } else if (intent === "interested" || intent === "wants_call") {
    action = "escalate_to_call";
  } else if (intent === "hard_no") {
    action = "mark_cold";
  } else if (intent === "soft_no") {
    action = "schedule_follow_up";
  }

  return { intent, sentiment, action, objection, confidence };
}

export async function POST(request: NextRequest) {
  try {
    const body: SuggestReplyRequest = await request.json();
    const {
      incomingMessage,
      leadName,
      propertyAddress,
      businessName,
      campaignType = "business_valuation",
      leadType,
      previousMessages = [],
      provider = "openai",
      personality: customPersonality,
      preset,
      tone,
      remixContext,
      sliders,
      trainingData = [],
    } = body;

    if (!incomingMessage) {
      return NextResponse.json(
        { error: "incomingMessage is required" },
        { status: 400 }
      );
    }

    // === CLASSIFY THE INCOMING MESSAGE ===
    const classification = classifyMessage(incomingMessage);

    // === BUILD PERSONALITY ===
    // Priority: custom personality > preset > derived from sliders > balanced default
    let personality: GiannaPersonality;

    if (customPersonality) {
      personality = { ...GIANNA_PRESETS.balanced, ...customPersonality };
    } else if (preset && GIANNA_PRESETS[preset]) {
      personality = GIANNA_PRESETS[preset];
    } else if (sliders) {
      // Map old sliders to new personality system
      personality = {
        ...GIANNA_PRESETS.balanced,
        warmth: sliders.conversational || 70,
        humor: sliders.humor || 40,
        urgency: sliders.urgency || 50,
        directness: sliders.directness || 60,
      };
    } else if (tone) {
      // Map old tone to preset
      const toneToPreset: Record<string, keyof typeof GIANNA_PRESETS> = {
        friendly: "balanced",
        professional: "cold_outreach",
        urgent: "warm_lead",
        casual: "balanced",
      };
      personality = GIANNA_PRESETS[toneToPreset[tone] || "balanced"];
    } else {
      // Auto-select based on classification
      if (classification.intent === "interested" || classification.intent === "wants_call") {
        personality = GIANNA_PRESETS.warm_lead;
      } else if (classification.objection) {
        personality = GIANNA_PRESETS.objection_handler;
      } else if (classification.sentiment === "negative") {
        personality = GIANNA_PRESETS.sensitive;
      } else {
        personality = GIANNA_PRESETS.balanced;
      }
    }

    // === BUILD SYSTEM PROMPT ===
    const systemPrompt = buildGiannaSystemPrompt(personality, {
      leadName,
      propertyAddress,
      businessName,
      campaignType,
      leadType,
      detectedObjection: classification.objection,
      detectedIntent: classification.intent,
      trainingData,
    });

    // Add any remix context
    const fullSystemPrompt = remixContext
      ? `${systemPrompt}\n\nADDITIONAL STYLE INSTRUCTIONS: ${remixContext}`
      : systemPrompt;

    // Build messages array
    const messages = [
      ...previousMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: incomingMessage },
    ];

    let suggestedReply = "";
    let confidence = classification.confidence;
    let usedProvider = provider;

    // === GENERATE RESPONSE ===
    if (provider === "anthropic" && ANTHROPIC_API_KEY) {
      const result = await generateWithAnthropic(fullSystemPrompt, messages, personality);
      suggestedReply = result.reply;
      confidence = Math.round((confidence + result.confidence) / 2);
    } else if (provider === "openai" && OPENAI_API_KEY) {
      const result = await generateWithOpenAI(fullSystemPrompt, messages, personality);
      suggestedReply = result.reply;
      confidence = Math.round((confidence + result.confidence) / 2);
    } else if (OPENAI_API_KEY) {
      const result = await generateWithOpenAI(fullSystemPrompt, messages, personality);
      suggestedReply = result.reply;
      confidence = Math.round((confidence + result.confidence) / 2);
      usedProvider = "openai";
    } else if (ANTHROPIC_API_KEY) {
      const result = await generateWithAnthropic(fullSystemPrompt, messages, personality);
      suggestedReply = result.reply;
      confidence = Math.round((confidence + result.confidence) / 2);
      usedProvider = "anthropic";
    } else {
      return NextResponse.json(
        { error: "No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY." },
        { status: 503 }
      );
    }

    // === BUILD RESPONSE ===
    return NextResponse.json({
      suggestedReply,
      confidence,
      provider: usedProvider,
      classification,
      characterCount: suggestedReply.length,
      isShortEnough: suggestedReply.length <= MESSAGE_RULES.sms.maxLength,
      isSingleSegment: suggestedReply.length <= MESSAGE_RULES.sms.maxLength,
      personality: preset || "auto",
      gianna: {
        name: GIANNA_IDENTITY.name,
        detected: {
          intent: classification.intent,
          objection: classification.objection,
          sentiment: classification.sentiment,
        },
        suggestedAction: classification.action,
      },
    });
  } catch (error) {
    console.error("[Gianna AI] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gianna couldn't generate a response" },
      { status: 500 }
    );
  }
}

// OpenAI generation with personality-based temperature
async function generateWithOpenAI(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  personality: GiannaPersonality
): Promise<{ reply: string; confidence: number }> {
  // Map personality to temperature (more humor/warmth = higher temp)
  const temperature = 0.5 + (personality.warmth + personality.humor) / 400;

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
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content?.trim() || "";

  // Confidence based on response quality
  let confidence = 75;
  if (reply.length > 10 && reply.length <= 160) confidence = 90;
  else if (reply.length > 160 && reply.length <= 320) confidence = 80;
  else if (reply.length > 320) confidence = 60;

  return { reply, confidence };
}

// Anthropic generation with personality-based temperature
async function generateWithAnthropic(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  personality: GiannaPersonality
): Promise<{ reply: string; confidence: number }> {
  // Map personality to temperature
  const temperature = 0.5 + (personality.warmth + personality.humor) / 400;

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
      temperature,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const reply = data.content?.[0]?.text?.trim() || "";

  // Confidence based on response quality
  let confidence = 80;
  if (reply.length > 10 && reply.length <= 160) confidence = 92;
  else if (reply.length > 160 && reply.length <= 320) confidence = 82;
  else if (reply.length > 320) confidence = 65;

  return { reply, confidence };
}

// GET - Gianna status and capabilities
export async function GET() {
  return NextResponse.json({
    name: GIANNA_IDENTITY.name,
    role: GIANNA_IDENTITY.role,
    company: GIANNA_IDENTITY.company,
    status: "online",
    providers: {
      openai: {
        configured: !!OPENAI_API_KEY,
        model: "gpt-4o-mini",
      },
      anthropic: {
        configured: !!ANTHROPIC_API_KEY,
        model: "claude-3-haiku-20240307",
      },
    },
    presets: Object.keys(GIANNA_PRESETS),
    personalityTraits: [
      "warmth",
      "directness",
      "humor",
      "formality",
      "urgency",
      "nudging",
      "assertiveness",
      "empathy",
      "curiosity",
      "closingPush",
    ],
    detectedIntents: Object.keys(RESPONSE_STRATEGIES),
    detectedObjections: Object.keys(OBJECTION_RESPONSES),
    leadTypes: Object.keys(LEAD_TYPE_APPROACHES),
    messageRules: MESSAGE_RULES.sms,
  });
}
