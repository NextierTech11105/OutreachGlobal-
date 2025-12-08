import { NextRequest, NextResponse } from "next/server";

// Gianna AI SMS webhook handler
// This receives inbound SMS messages and generates AI responses
// Detects emails to trigger valuation report + calendar automation

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app";
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Simple conversation context store (would be DB in production)
const conversationContext = new Map<string, {
  firstName?: string;
  propertyId?: string;
  propertyAddress?: string;
  lastMessageAt: string;
  messageCount: number;
}>();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract Twilio webhook parameters
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const body = formData.get("Body") as string;
    const messageSid = formData.get("MessageSid") as string;

    console.log("[Gianna SMS] Inbound message:", { from, to, body: body?.slice(0, 50) });

    if (!from || !body) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Update conversation context
    const ctx = conversationContext.get(from) || { lastMessageAt: "", messageCount: 0 };
    ctx.lastMessageAt = new Date().toISOString();
    ctx.messageCount++;
    conversationContext.set(from, ctx);

    // Check for email in message - trigger automation flow
    const emailMatch = body.match(EMAIL_REGEX);
    if (emailMatch) {
      const email = emailMatch[0].toLowerCase();
      console.log(`[Gianna SMS] Email captured: ${email} from ${from}`);

      // Trigger email capture automation (async - don't wait)
      fetch(`${APP_URL}/api/automation/email-capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          smsMessage: body,
          fromPhone: from,
          toPhone: to,
          firstName: ctx.firstName,
          propertyId: ctx.propertyId,
          propertyAddress: ctx.propertyAddress,
        }),
      }).catch((err) => console.error("[Gianna SMS] Automation trigger failed:", err));

      // Respond with confirmation - automation sends the follow-up email
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Perfect${ctx.firstName ? ` ${ctx.firstName}` : ""}! Just sent your property analysis to ${email}. Check your inbox (and spam folder just in case). When you're ready to talk strategy, my calendar link is in there too. 📧</Message>
</Response>`;

      return new NextResponse(twiml, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Get AI response from Gianna
    let aiResponse = "";

    try {
      const suggestResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app"}/api/ai/suggest-reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            incomingMessage: body,
            campaignType: "real_estate",
            tone: "friendly",
          }),
        }
      );

      if (suggestResponse.ok) {
        const data = await suggestResponse.json();
        aiResponse = data.suggestedReply || "";

        // Check confidence threshold
        const confidence = data.confidence || 0;
        if (confidence < 70) {
          console.log("[Gianna SMS] Low confidence, not auto-responding:", confidence);
          // Don't auto-respond if confidence is too low
          // Human will need to review
          aiResponse = "";
        }
      }
    } catch (err) {
      console.error("[Gianna SMS] AI suggestion failed:", err);
    }

    // Handle opt-out keywords
    const optOutKeywords = ["stop", "unsubscribe", "opt out", "opt-out", "remove", "cancel"];
    if (optOutKeywords.some((kw) => body.toLowerCase().includes(kw))) {
      aiResponse = "You've been removed from our list. Take care!";
      // TODO: Add to suppression list
    }

    // If we have a response, send it via TwiML
    if (aiResponse) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(aiResponse)}</Message>
</Response>`;

      console.log("[Gianna SMS] Auto-responding:", aiResponse.slice(0, 50));

      return new NextResponse(twiml, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // No auto-response, just acknowledge receipt
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (error) {
    console.error("[Gianna SMS] Error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
