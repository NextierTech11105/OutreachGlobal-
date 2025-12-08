import { NextRequest, NextResponse } from "next/server";

// AI Voicemail Analyzer - Uses Gianna AI to analyze voicemail transcriptions

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

interface VoicemailAnalysis {
  summary: string;
  intent: "interested" | "not_interested" | "callback_request" | "question" | "complaint" | "unknown";
  sentiment: "positive" | "negative" | "neutral";
  priority: "high" | "medium" | "low";
  keyPoints: string[];
  suggestedAction: string;
  leadScore: number; // 0-100
  extractedInfo: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    timeframe?: string;
    budget?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcription, from, to, callSid } = body;

    if (!transcription) {
      return NextResponse.json({ error: "Transcription required" }, { status: 400 });
    }

    console.log("[AI Voicemail] Analyzing:", {
      from,
      textLength: transcription.length,
    });

    // Try Anthropic first, fallback to OpenAI
    let analysis: VoicemailAnalysis | null = null;

    if (ANTHROPIC_API_KEY) {
      try {
        analysis = await analyzeWithAnthropic(transcription, from);
      } catch (err) {
        console.error("[AI Voicemail] Anthropic failed:", err);
      }
    }

    if (!analysis && OPENAI_API_KEY) {
      try {
        analysis = await analyzeWithOpenAI(transcription, from);
      } catch (err) {
        console.error("[AI Voicemail] OpenAI failed:", err);
      }
    }

    // Fallback to basic analysis if AI fails
    if (!analysis) {
      analysis = basicAnalysis(transcription);
    }

    return NextResponse.json({
      success: true,
      analysis,
      from,
      callSid,
    });
  } catch (error) {
    console.error("[AI Voicemail] Error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

async function analyzeWithAnthropic(transcription: string, from: string): Promise<VoicemailAnalysis> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyze this voicemail transcription from a real estate context and return a JSON analysis.

Voicemail from ${from}:
"${transcription}"

Return ONLY valid JSON with this structure:
{
  "summary": "Brief 1-2 sentence summary",
  "intent": "interested|not_interested|callback_request|question|complaint|unknown",
  "sentiment": "positive|negative|neutral",
  "priority": "high|medium|low",
  "keyPoints": ["point1", "point2"],
  "suggestedAction": "What action to take",
  "leadScore": 0-100,
  "extractedInfo": {
    "name": "if mentioned",
    "phone": "if different from caller",
    "email": "if mentioned",
    "address": "if mentioned",
    "timeframe": "when they want to act",
    "budget": "if mentioned"
  }
}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Anthropic API failed");
  }

  const data = await response.json();
  const content = data.content[0]?.text || "";

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error("Failed to parse Anthropic response");
}

async function analyzeWithOpenAI(transcription: string, from: string): Promise<VoicemailAnalysis> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a real estate AI assistant analyzing voicemails. Return only valid JSON.",
        },
        {
          role: "user",
          content: `Analyze this voicemail from ${from}:
"${transcription}"

Return JSON with: summary, intent (interested/not_interested/callback_request/question/complaint/unknown), sentiment (positive/negative/neutral), priority (high/medium/low), keyPoints array, suggestedAction, leadScore 0-100, extractedInfo object with name/phone/email/address/timeframe/budget if mentioned.`,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI API failed");
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error("Failed to parse OpenAI response");
}

function basicAnalysis(transcription: string): VoicemailAnalysis {
  const lower = transcription.toLowerCase();

  // Detect intent
  let intent: VoicemailAnalysis["intent"] = "unknown";
  let priority: VoicemailAnalysis["priority"] = "medium";
  let leadScore = 50;

  if (
    lower.includes("interested") ||
    lower.includes("want to sell") ||
    lower.includes("looking to sell") ||
    lower.includes("call me back")
  ) {
    intent = "interested";
    priority = "high";
    leadScore = 80;
  } else if (
    lower.includes("not interested") ||
    lower.includes("stop calling") ||
    lower.includes("remove")
  ) {
    intent = "not_interested";
    priority = "low";
    leadScore = 10;
  } else if (lower.includes("question") || lower.includes("wondering")) {
    intent = "question";
    priority = "medium";
    leadScore = 60;
  } else if (lower.includes("call") && lower.includes("back")) {
    intent = "callback_request";
    priority = "high";
    leadScore = 70;
  }

  // Detect sentiment
  let sentiment: VoicemailAnalysis["sentiment"] = "neutral";
  if (
    lower.includes("thank") ||
    lower.includes("great") ||
    lower.includes("appreciate") ||
    lower.includes("interested")
  ) {
    sentiment = "positive";
  } else if (
    lower.includes("angry") ||
    lower.includes("upset") ||
    lower.includes("complaint") ||
    lower.includes("stop")
  ) {
    sentiment = "negative";
  }

  return {
    summary: `Voicemail received. ${intent === "interested" ? "Caller seems interested." : "Review needed."}`,
    intent,
    sentiment,
    priority,
    keyPoints: ["Voicemail received", "Manual review recommended"],
    suggestedAction: intent === "interested" ? "Call back within 1 hour" : "Review and respond appropriately",
    leadScore,
    extractedInfo: {},
  };
}
