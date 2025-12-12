import { NextRequest, NextResponse } from "next/server";

// AI Campaign SMS Generator - Creates initial outreach messages
// Based on tone sliders and intent selection

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

interface GenerateCampaignSmsRequest {
  // Tone sliders (0-100)
  sliders: {
    conversational: number;
    humor: number;
    urgency: number;
    directness: number;
  };
  // Primary intent/goal
  intent:
    | "book_appointment"
    | "get_callback"
    | "qualify_lead"
    | "make_offer"
    | "soft_intro";
  // Context
  campaignType?: "real_estate" | "b2b" | "financial" | "default";
  propertyType?: string;
  leadType?: string; // e.g., "pre_foreclosure", "absentee_owner"
  // AI provider
  provider?: "openai" | "anthropic";
  // Number of variations to generate
  variations?: number;
}

// Intent-specific instructions
const INTENT_PROMPTS: Record<string, string> = {
  book_appointment: `PRIMARY GOAL: Get them to book a meeting or appointment.
Include a clear call-to-action for scheduling.
Mention flexibility on timing ("your schedule", "whenever works for you").
Create urgency without being pushy.`,

  get_callback: `PRIMARY GOAL: Get them to call you back.
Ask a question that requires a phone response.
Make it easy - just "give me a quick call" or "reply with a good time".
Create curiosity about what you can offer.`,

  qualify_lead: `PRIMARY GOAL: Determine if they're a motivated seller.
Ask a qualifying question (timeline, situation, interest level).
Don't make an offer yet - just gather information.
Keep it conversational and non-threatening.`,

  make_offer: `PRIMARY GOAL: Make a compelling cash offer inquiry.
Mention you can pay cash and close quickly.
Offer flexibility on their timeline.
Remove obstacles (as-is, no repairs, no commissions).`,

  soft_intro: `PRIMARY GOAL: Introduce yourself without asking for anything.
Just say hello and that you noticed their property.
Plant a seed for future contact.
Be friendly and memorable, not salesy.`,
};

// Lead type context for real estate
const LEAD_TYPE_CONTEXT: Record<string, string> = {
  pre_foreclosure:
    "The owner may be facing financial stress. Be empathetic and position yourself as a solution, not a vulture.",
  foreclosure: "Time is critical. Emphasize speed and certainty of close.",
  absentee_owner:
    "They may not be emotionally attached. Focus on convenience and hassle-free sale.",
  vacant:
    "The property might be a burden. Highlight that you handle everything.",
  tax_lien:
    "Financial pressure exists. Be respectful but mention you can help resolve their situation.",
  inherited:
    "They may be overwhelmed with an unexpected property. Be compassionate and helpful.",
  high_equity: "They have options. Focus on your value proposition over price.",
  divorce:
    "Sensitive situation. Be professional and emphasize quick, clean solutions.",
  tired_landlord:
    "They're done dealing with tenants. Emphasize hassle-free cash sale.",
  reverse_mortgage:
    "Older homeowner potentially with equity needs. Be respectful and emphasize no-pressure approach.",
};

// Convert sliders to tone description
function slidersToToneDescription(
  sliders: GenerateCampaignSmsRequest["sliders"],
): string {
  const parts = [];

  // Conversational
  if (sliders.conversational > 80) parts.push("very casual and text-like");
  else if (sliders.conversational > 60)
    parts.push("conversational and friendly");
  else if (sliders.conversational > 40)
    parts.push("personable but professional");
  else if (sliders.conversational > 20)
    parts.push("professional and business-like");
  else parts.push("formal and reserved");

  // Humor
  if (sliders.humor > 70) parts.push("with playful humor and personality");
  else if (sliders.humor > 40) parts.push("with light, friendly wit");
  else if (sliders.humor > 20) parts.push("with a touch of warmth");
  // Below 20 = no humor mention

  // Urgency
  if (sliders.urgency > 80)
    parts.push("conveying strong urgency (time-sensitive)");
  else if (sliders.urgency > 60) parts.push("with moderate urgency");
  else if (sliders.urgency > 40) parts.push("with gentle purpose");
  else parts.push("relaxed and no-pressure");

  // Directness
  if (sliders.directness > 80) parts.push("very direct and to the point");
  else if (sliders.directness > 60) parts.push("clear and straightforward");
  else if (sliders.directness > 40) parts.push("balanced approach");
  else if (sliders.directness > 20) parts.push("soft and roundabout");
  else parts.push("very indirect and subtle");

  return parts.join(", ");
}

// Generate with OpenAI
async function generateWithOpenAI(
  systemPrompt: string,
  userPrompt: string,
  variations: number,
): Promise<string[]> {
  const messages = [];

  for (let i = 0; i < variations; i++) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              userPrompt +
              (i > 0
                ? `\n\nGenerate variation #${i + 1} - make it distinctly different from previous attempts.`
                : ""),
          },
        ],
        max_tokens: 100,
        temperature: 0.8 + i * 0.1, // Increase temp for more variety
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "";
    if (reply) messages.push(reply);
  }

  return messages;
}

// Generate with Anthropic
async function generateWithAnthropic(
  systemPrompt: string,
  userPrompt: string,
  variations: number,
): Promise<string[]> {
  const messages = [];

  for (let i = 0; i < variations; i++) {
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
        messages: [
          {
            role: "user",
            content:
              userPrompt +
              (i > 0
                ? `\n\nGenerate variation #${i + 1} - make it distinctly different.`
                : ""),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text?.trim() || "";
    if (reply) messages.push(reply);
  }

  return messages;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateCampaignSmsRequest = await request.json();
    const {
      sliders,
      intent,
      campaignType = "real_estate",
      propertyType,
      leadType,
      provider = "openai",
      variations = 3,
    } = body;

    // Validate
    if (!sliders || !intent) {
      return NextResponse.json(
        { error: "sliders and intent are required" },
        { status: 400 },
      );
    }

    // Build the system prompt
    const toneDescription = slidersToToneDescription(sliders);
    const intentInstructions =
      INTENT_PROMPTS[intent] || INTENT_PROMPTS.soft_intro;
    const leadContext = leadType ? LEAD_TYPE_CONTEXT[leadType] || "" : "";

    const systemPrompt = `You are an expert SMS copywriter for ${campaignType === "real_estate" ? "real estate investor outreach" : "business outreach"}.

CRITICAL RULES:
1. Messages MUST be under 160 characters (SMS limit)
2. Sound human, not like a robot or template
3. No emojis unless conversational slider is above 70
4. Include a clear next step or question
5. Never use generic phrases like "I hope this finds you well"

TONE REQUIREMENTS:
${toneDescription}

${intentInstructions}

${leadContext ? `LEAD CONTEXT: ${leadContext}` : ""}

PROPERTY TYPE: ${propertyType || "Residential property"}

Write SMS messages that feel personal and genuine, like they're from a real person who actually cares.`;

    const userPrompt = `Write a short SMS message (under 160 chars) for initial outreach.
The goal is: ${intent.replace("_", " ")}.
Make it ${toneDescription}.
Just write the message, nothing else.`;

    // Generate messages
    let messages: string[] = [];
    let usedProvider = provider;

    if (provider === "anthropic" && ANTHROPIC_API_KEY) {
      messages = await generateWithAnthropic(
        systemPrompt,
        userPrompt,
        variations,
      );
    } else if (provider === "openai" && OPENAI_API_KEY) {
      messages = await generateWithOpenAI(systemPrompt, userPrompt, variations);
    } else if (OPENAI_API_KEY) {
      messages = await generateWithOpenAI(systemPrompt, userPrompt, variations);
      usedProvider = "openai";
    } else if (ANTHROPIC_API_KEY) {
      messages = await generateWithAnthropic(
        systemPrompt,
        userPrompt,
        variations,
      );
      usedProvider = "anthropic";
    } else {
      return NextResponse.json(
        { error: "No AI provider configured" },
        { status: 503 },
      );
    }

    // Filter and analyze results
    const results = messages.map((msg, i) => ({
      id: i,
      message: msg,
      characterCount: msg.length,
      isShortEnough: msg.length <= 160,
      toneMatch: analyzeToneMatch(msg, sliders),
    }));

    return NextResponse.json({
      messages: results,
      provider: usedProvider,
      settings: {
        intent,
        sliders,
        toneDescription,
      },
    });
  } catch (error) {
    console.error("[AI Campaign SMS] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate" },
      { status: 500 },
    );
  }
}

// Analyze how well the message matches the intended tone
function analyzeToneMatch(
  message: string,
  sliders: GenerateCampaignSmsRequest["sliders"],
): number {
  let score = 70; // Base score

  const lower = message.toLowerCase();

  // Check conversational markers
  const casualMarkers = ["hey", "hi!", "gonna", "wanna", "btw", "lmk"];
  const formalMarkers = ["dear", "regarding", "inquire", "sincerely"];

  const hasCasual = casualMarkers.some((m) => lower.includes(m));
  const hasFormal = formalMarkers.some((m) => lower.includes(m));

  if (sliders.conversational > 60 && hasCasual) score += 10;
  if (sliders.conversational < 40 && hasFormal) score += 10;

  // Check urgency markers
  const urgentMarkers = [
    "asap",
    "today",
    "now",
    "quick",
    "fast",
    "soon",
    "limited",
  ];
  const hasUrgent = urgentMarkers.some((m) => lower.includes(m));

  if (sliders.urgency > 60 && hasUrgent) score += 10;
  if (sliders.urgency < 40 && !hasUrgent) score += 5;

  // Check directness (questions vs statements)
  const hasQuestion = message.includes("?");
  if (sliders.directness > 60 && !hasQuestion) score += 5;
  if (sliders.directness < 40 && hasQuestion) score += 5;

  return Math.min(100, score);
}

// GET - Return available options
export async function GET() {
  return NextResponse.json({
    intents: [
      {
        id: "book_appointment",
        label: "Book Appointment",
        description: "Schedule a meeting or call",
      },
      {
        id: "get_callback",
        label: "Get Callback",
        description: "Get them to call you back",
      },
      {
        id: "qualify_lead",
        label: "Qualify Lead",
        description: "Determine interest level",
      },
      {
        id: "make_offer",
        label: "Make Offer",
        description: "Present a cash offer",
      },
      {
        id: "soft_intro",
        label: "Soft Introduction",
        description: "Just say hello",
      },
    ],
    sliderDefaults: {
      conversational: 60,
      humor: 20,
      urgency: 40,
      directness: 50,
    },
    providers: {
      openai: !!OPENAI_API_KEY,
      anthropic: !!ANTHROPIC_API_KEY,
    },
  });
}
