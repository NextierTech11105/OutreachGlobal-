import { NextRequest, NextResponse } from "next/server";

// Remix SMS to exactly 160 characters while preserving meaning and variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

interface RemixSmsRequest {
  content: string;
  targetLength?: number;
  preserveVariables?: boolean;
  worker?: "gianna" | "cathy" | "sabrina";
  category?: string;
}

const WORKER_STYLES: Record<string, string> = {
  gianna: "professional, warm, direct opener style",
  cathy: "friendly, light humor, nudge style",
  sabrina: "confident, closing, booking-focused style",
};

export async function POST(request: NextRequest) {
  try {
    const body: RemixSmsRequest = await request.json();
    const {
      content,
      targetLength = 160,
      preserveVariables = true,
      worker = "gianna",
      category = "initial",
    } = body;

    if (!content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    // Extract variables from content
    const variables = content.match(/\{[^}]+\}/g) || [];
    const variableList = variables.join(", ");

    const systemPrompt = `You are an expert SMS copywriter. Your task is to shorten an SMS message to EXACTLY ${targetLength} characters or less while preserving:
1. The core message and intent
2. ${preserveVariables ? `All template variables (${variableList || "none"})` : "No variables needed"}
3. A natural, conversational tone
4. The ${WORKER_STYLES[worker] || "professional"} voice

CRITICAL RULES:
- Output MUST be ${targetLength} characters or fewer
- Keep the same intent and call-to-action
- ${preserveVariables ? "KEEP all {variableName} placeholders exactly as they are" : "Remove template variables"}
- Sound human, not robotic
- Remove filler words and unnecessary phrases
- Be punchy and direct`;

    const userPrompt = `Shorten this SMS to ${targetLength} chars or less. Keep variables like ${variableList}:

"${content}"

Current length: ${content.length} chars
Target: ${targetLength} chars

Just output the shortened message, nothing else.`;

    let remixedContent = "";

    // Try OpenAI first
    if (OPENAI_API_KEY) {
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
            { role: "user", content: userPrompt },
          ],
          max_tokens: 80,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        remixedContent = data.choices?.[0]?.message?.content?.trim() || "";

        // Clean up any quotes
        remixedContent = remixedContent.replace(/^["']|["']$/g, "");
      }
    }
    // Fallback to Anthropic
    else if (ANTHROPIC_API_KEY) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 80,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        remixedContent = data.content?.[0]?.text?.trim() || "";
        remixedContent = remixedContent.replace(/^["']|["']$/g, "");
      }
    }

    // If no AI available or failed, do intelligent truncation
    if (!remixedContent || remixedContent.length > targetLength) {
      remixedContent = intelligentTruncate(content, targetLength, variables);
    }

    // Final safety check - if still too long, hard truncate
    if (remixedContent.length > targetLength) {
      remixedContent = remixedContent.substring(0, targetLength - 3) + "...";
    }

    return NextResponse.json({
      success: true,
      remixedContent,
      originalLength: content.length,
      newLength: remixedContent.length,
      targetLength,
      variablesPreserved: preserveVariables,
      variablesFound: variables,
    });
  } catch (error) {
    console.error("[Remix SMS] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Remix failed" },
      { status: 500 }
    );
  }
}

// Intelligent truncation that preserves variables and tries to end on a complete word
function intelligentTruncate(
  content: string,
  targetLength: number,
  variables: string[]
): string {
  // First, try removing common filler phrases
  let shortened = content
    .replace(/I just wanted to /gi, "")
    .replace(/I wanted to /gi, "")
    .replace(/Just a quick /gi, "Quick ")
    .replace(/I'm reaching out because /gi, "")
    .replace(/I hope this finds you well\. /gi, "")
    .replace(/I was wondering if /gi, "")
    .replace(/Would you be open to /gi, "Open to ")
    .replace(/Let me know if you're interested\./gi, "Interested?")
    .replace(/Looking forward to hearing from you\./gi, "")
    .replace(/Please feel free to /gi, "")
    .replace(/at your earliest convenience/gi, "soon")
    .replace(/  +/g, " ")
    .trim();

  if (shortened.length <= targetLength) {
    return shortened;
  }

  // If still too long, truncate at word boundary
  const words = shortened.split(" ");
  let result = "";

  for (const word of words) {
    const potential = result ? result + " " + word : word;
    if (potential.length <= targetLength - 3) {
      result = potential;
    } else {
      break;
    }
  }

  // Make sure we kept all variables
  for (const variable of variables) {
    if (!result.includes(variable)) {
      // Variable was cut off - this is a problem, return simpler truncation
      return content.substring(0, targetLength - 3) + "...";
    }
  }

  return result + (result.length < shortened.length ? "..." : "");
}
