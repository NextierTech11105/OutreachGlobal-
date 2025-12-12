import { NextRequest, NextResponse } from "next/server";

// Gianna AI Chat API - General purpose assistant for the platform
// Powered by OpenAI or Anthropic

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

interface ChatRequest {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: {
    page?: string;
    leadName?: string;
    leadPhone?: string;
    campaignType?: string;
    currentPage?: string;
  };
}

const GIANNA_SYSTEM_PROMPT = `You are Gianna, an AI Sales Development Representative (SDR) assistant for Nextier, a powerful outreach platform.

Your personality:
- Friendly, confident, and helpful
- You speak like a knowledgeable colleague, not a robot
- You're proactive and solution-oriented
- You keep responses concise but valuable

Your capabilities:
- Help draft SMS messages for campaigns (real estate, B2B, financial)
- Analyze lead engagement and suggest follow-up strategies
- Answer questions about using the platform
- Provide campaign optimization advice
- Help with objection handling scripts
- Generate message variations and A/B test ideas

Platform knowledge:
- Property Search: Search 150M+ properties with RealEstateAPI, filter by motivated seller types
- Company Search: Search 334M+ B2B contacts with Apollo.io
- Skip Trace: Get cell phones and emails for $0.05/record via RealEstateAPI
- Universal Inbox: See all SMS responses in one place
- Campaigns: Create drip campaigns with Gianna AI auto-responses
- Power Dialer: Call leads directly from the platform

When helping with messages:
- Keep SMS under 160 characters when possible
- Focus on moving conversations toward calls/meetings
- Be personable but professional
- Avoid being pushy - build rapport first

Current context may be provided about what page the user is on and what they're working on.
Use this to give contextually relevant help.

Keep responses SHORT and actionable. No fluff.`;

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, history = [], context = {} } = body;

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }

    // Build context string
    const contextParts = [];
    if (context.page) contextParts.push(`User is on: ${context.page} page`);
    if (context.leadName)
      contextParts.push(`Working with lead: ${context.leadName}`);
    if (context.leadPhone)
      contextParts.push(`Lead phone: ${context.leadPhone}`);
    if (context.currentPage)
      contextParts.push(`Current URL: ${context.currentPage}`);

    const contextString =
      contextParts.length > 0
        ? `\n\nCurrent context:\n${contextParts.join("\n")}`
        : "";

    const fullSystemPrompt = GIANNA_SYSTEM_PROMPT + contextString;

    // Build messages
    const messages = [
      ...history.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    let response = "";

    // Try OpenAI first, then Anthropic
    if (OPENAI_API_KEY) {
      response = await generateWithOpenAI(fullSystemPrompt, messages);
    } else if (ANTHROPIC_API_KEY) {
      response = await generateWithAnthropic(fullSystemPrompt, messages);
    } else {
      return NextResponse.json(
        { error: "No AI provider configured" },
        { status: 503 },
      );
    }

    return NextResponse.json({
      response,
      success: true,
    });
  } catch (error) {
    console.error("[Gianna Chat] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 },
    );
  }
}

async function generateWithOpenAI(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 500,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return (
    data.choices?.[0]?.message?.content?.trim() ||
    "I couldn't generate a response."
  );
}

async function generateWithAnthropic(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
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
  return data.content?.[0]?.text?.trim() || "I couldn't generate a response.";
}

// GET - Health check
export async function GET() {
  return NextResponse.json({
    name: "Gianna",
    status: "online",
    providers: {
      openai: !!OPENAI_API_KEY,
      anthropic: !!ANTHROPIC_API_KEY,
    },
  });
}
