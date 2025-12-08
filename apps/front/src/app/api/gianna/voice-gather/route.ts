import { NextRequest, NextResponse } from "next/server";

// Handle speech input from Gianna voice calls
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const speechResult = formData.get("SpeechResult") as string;
    const confidence = formData.get("Confidence") as string;
    const from = formData.get("From") as string;
    const callSid = formData.get("CallSid") as string;

    console.log("[Gianna Voice Gather]", { speechResult, confidence, from });

    if (!speechResult) {
      // No speech detected
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I didn't catch that. Let me transfer you to a team member.</Say>
  <Record maxLength="60" transcribe="true" />
</Response>`;
      return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
    }

    // Process speech with AI
    let aiResponse = "";

    try {
      const suggestResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app"}/api/ai/suggest-reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            incomingMessage: speechResult,
            campaignType: "real_estate",
            tone: "professional",
          }),
        }
      );

      if (suggestResponse.ok) {
        const data = await suggestResponse.json();
        aiResponse = data.suggestedReply || "";
      }
    } catch (err) {
      console.error("[Gianna Voice] AI error:", err);
    }

    // Check for key intents
    const lowerSpeech = speechResult.toLowerCase();

    // Want to talk to human
    if (
      lowerSpeech.includes("representative") ||
      lowerSpeech.includes("person") ||
      lowerSpeech.includes("human") ||
      lowerSpeech.includes("agent")
    ) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Absolutely! Let me connect you with a team member right away.</Say>
  <Dial timeout="30">
    <Number>${process.env.TWILIO_FORWARD_NUMBER || "+18889990001"}</Number>
  </Dial>
  <Say voice="alice">I'm sorry, all our representatives are currently busy. Please leave a message.</Say>
  <Record maxLength="120" transcribe="true" />
</Response>`;
      return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
    }

    // Interested in valuation
    if (
      lowerSpeech.includes("value") ||
      lowerSpeech.includes("worth") ||
      lowerSpeech.includes("interested") ||
      lowerSpeech.includes("sell")
    ) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">
    That's great to hear! We can help you understand your property's true market value.
    I'll have one of our specialists call you back within the hour to discuss your property.
    Is there anything specific you'd like us to know about your property before we call?
  </Say>
  <Gather input="speech" timeout="5" action="/api/gianna/voice-gather">
    <Say voice="alice">Please share any details now, or just hang up and we'll call you back.</Say>
  </Gather>
  <Say voice="alice">Perfect! We'll be in touch shortly. Thank you for your interest. Goodbye!</Say>
</Response>`;
      return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
    }

    // Default AI response
    if (aiResponse) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(aiResponse)}</Say>
  <Gather input="speech" timeout="5" action="/api/gianna/voice-gather">
    <Say voice="alice">Is there anything else I can help you with?</Say>
  </Gather>
  <Say voice="alice">Thank you for calling. Have a great day!</Say>
</Response>`;
      return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
    }

    // Fallback
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I understand. A member of our team will follow up with you shortly. Thank you for your time!</Say>
</Response>`;

    return new NextResponse(fallbackTwiml, { headers: { "Content-Type": "text/xml" } });
  } catch (error) {
    console.error("[Gianna Voice Gather] Error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred. Goodbye.</Say></Response>`,
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
