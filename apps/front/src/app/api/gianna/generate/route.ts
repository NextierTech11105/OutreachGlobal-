import { NextRequest, NextResponse } from "next/server";
import {
  gianna,
  type GiannaContext,
  type GiannaResponse,
} from "@/lib/gianna/gianna-service";
import { PERSONALITY_ARCHETYPES } from "@/lib/gianna/personality-dna";

/**
 * GIANNA AI RESPONSE GENERATOR API
 *
 * Main API endpoint for generating Gianna AI responses.
 * Used by: SMS workflows, chat widgets, email composition, etc.
 *
 * Endpoints:
 * POST /api/gianna/generate - Generate a response to incoming message
 * POST /api/gianna/generate?action=opener - Generate opener messages
 * POST /api/gianna/generate?action=systemPrompt - Get system prompt for AI
 */

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "respond";
    const body = await request.json();

    switch (action) {
      case "respond":
        return handleRespond(body);
      case "opener":
        return handleOpener(body);
      case "systemPrompt":
        return handleSystemPrompt(body);
      case "personalities":
        return handlePersonalities();
      case "classify":
        return handleClassify(body);
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[Gianna API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * Generate response to incoming message
 */
async function handleRespond(body: {
  message: string;
  context: Partial<GiannaContext>;
}): Promise<NextResponse> {
  const { message, context } = body;

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Build full context with defaults
  const fullContext: GiannaContext = {
    channel: context.channel || "sms",
    stage: context.stage || "cold_open",
    messageNumber: context.messageNumber || 1,
    ...context,
  };

  // Generate response
  const response = await gianna.generateResponse(message, fullContext);

  return NextResponse.json({
    success: true,
    response: {
      message: response.message,
      personality: response.personality,
      confidence: response.confidence,
      intent: response.intent,
      suggestedFlow: response.suggestedFlow,
      requiresHumanReview: response.requiresHumanReview,
      nextAction: response.nextAction,
      alternatives: response.alternatives,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      context: fullContext,
    },
  });
}

/**
 * Generate opener messages for outreach
 */
async function handleOpener(body: {
  context: Partial<GiannaContext>;
  category?: "property" | "business" | "general" | "ny_direct";
  count?: number;
}): Promise<NextResponse> {
  const { context, category = "general", count = 5 } = body;

  // Build full context with defaults
  const fullContext: GiannaContext = {
    channel: context.channel || "sms",
    stage: "cold_open",
    messageNumber: 1,
    ...context,
  };

  // Generate openers
  const openers = gianna.generateOpeners({
    context: fullContext,
    category,
    count,
  });

  // Also generate industry-specific opener if industry is provided
  let industryOpener: string | undefined;
  if (fullContext.industry) {
    industryOpener = gianna.generateIndustryOpener(
      fullContext.industry,
      fullContext,
    );
  }

  return NextResponse.json({
    success: true,
    openers,
    industryOpener,
    category,
    meta: {
      generatedAt: new Date().toISOString(),
      context: fullContext,
    },
  });
}

/**
 * Get system prompt for AI model
 */
async function handleSystemPrompt(body: {
  context: Partial<GiannaContext>;
}): Promise<NextResponse> {
  const { context } = body;

  // Build full context with defaults
  const fullContext: GiannaContext = {
    channel: context.channel || "sms",
    stage: context.stage || "cold_open",
    messageNumber: context.messageNumber || 1,
    ...context,
  };

  const systemPrompt = gianna.generateSystemPrompt(fullContext);

  return NextResponse.json({
    success: true,
    systemPrompt,
    meta: {
      generatedAt: new Date().toISOString(),
      context: fullContext,
    },
  });
}

/**
 * Get available personalities
 */
async function handlePersonalities(): Promise<NextResponse> {
  const personalities = Object.entries(PERSONALITY_ARCHETYPES).map(
    ([id, p]) => ({
      id,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      traits: {
        warmth: p.warmth,
        directness: p.directness,
        humor: p.humor,
        energy: p.energy,
        assertiveness: p.assertiveness,
      },
      bestFor: p.bestFor,
    }),
  );

  return NextResponse.json({
    success: true,
    personalities,
    count: personalities.length,
  });
}

/**
 * Classify an incoming message
 */
async function handleClassify(body: {
  message: string;
}): Promise<NextResponse> {
  const { message } = body;

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Import classifyResponse
  const { classifyResponse } = await import("@/lib/gianna/conversation-flows");
  const classification = classifyResponse(message);

  return NextResponse.json({
    success: true,
    classification: {
      intent: classification.intent,
      confidence: classification.confidence,
      sentiment: classification.sentiment,
      urgency: classification.urgency,
      suggestedFlow: classification.suggestedFlow,
      suggestedPersonality: classification.suggestedPersonality,
    },
    meta: {
      analyzedAt: new Date().toISOString(),
    },
  });
}

/**
 * GET - Health check and API info
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "personalities") {
    return handlePersonalities();
  }

  return NextResponse.json({
    name: "Gianna AI Response Generator",
    version: "2.0.0",
    status: "operational",
    endpoints: {
      "POST /api/gianna/generate": "Generate response to message",
      "POST /api/gianna/generate?action=opener": "Generate opener messages",
      "POST /api/gianna/generate?action=systemPrompt": "Get AI system prompt",
      "POST /api/gianna/generate?action=classify": "Classify message intent",
      "GET /api/gianna/generate?action=personalities":
        "List available personalities",
    },
    features: [
      "8 personality archetypes",
      "15+ conversation flows",
      "160+ message templates",
      "Intent classification",
      "Objection handling",
      "Human-in-loop for rebuttals",
      "Email capture automation",
    ],
    documentation: "https://docs.nextier.app/gianna",
  });
}
