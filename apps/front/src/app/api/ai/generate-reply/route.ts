import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { smsMessages, leads } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { AI_ASSISTANT_NAME, COMPANY_NAME } from "@/config/branding";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, messageContent, context = {} } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 },
      );
    }

    // 1. Fetch lead details
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // 2. Fetch conversation history
    const history = await db
      .select()
      .from(smsMessages)
      .where(eq(smsMessages.leadId, leadId))
      .orderBy(desc(smsMessages.createdAt))
      .limit(10);

    // Reverse to get chronological order
    const sortedHistory = history.reverse();

    // 3. Construct prompt
    const historyString = sortedHistory
      .map(
        (m) => `${m.direction === "inbound" ? "Lead" : "Assistant"}: ${m.body}`,
      )
      .join("\n");

    const systemPrompt = `You are ${AI_ASSISTANT_NAME}, an AI Sales Development Representative (SDR) for ${COMPANY_NAME}.
Your goal is to respond to leads via SMS and move them toward a phone call or appointment.

Lead Name: ${lead.firstName} ${lead.lastName}
Property: ${(lead as any).propertyAddress || "Unknown"}
Status: ${lead.status}

Conversation History:
${historyString}

Current Message from Lead:
${messageContent}

Guidelines:
- Keep responses under 160 characters.
- Be friendly, professional, and helpful.
- If they ask about price, mention we need a quick call to give an accurate valuation.
- If they seem interested, suggest a quick 5-minute call.
- Do not use placeholders like [Name], use the lead's name if appropriate.
- Respond ONLY with the message body.`;

    // 4. Call OpenAI (or simulate if no key)
    let suggestedReply = "";

    if (OPENAI_API_KEY) {
      try {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: messageContent },
              ],
              temperature: 0.7,
              max_tokens: 150,
            }),
          },
        );

        const data = await response.json();
        suggestedReply = data.choices[0].message.content.trim();
      } catch (error) {
        console.error("[AI Reply] OpenAI Error:", error);
        suggestedReply = `Hi ${lead.firstName}, thanks for reaching out! I'd love to chat more about ${(lead as any).propertyAddress || "your property"}. When is a good time for a quick 5-minute call?`;
      }
    } else {
      // Simulation mode
      console.log("[AI Reply] No API key, simulating response...");
      suggestedReply = `Hi ${lead.firstName}, I received your message about ${(lead as any).propertyAddress || "the property"}. I'd love to discuss this further with you. Do you have a few minutes for a quick call today?`;
    }

    return NextResponse.json({
      success: true,
      reply: suggestedReply,
    });
  } catch (error: any) {
    console.error("[AI Reply] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate reply" },
      { status: 500 },
    );
  }
}
