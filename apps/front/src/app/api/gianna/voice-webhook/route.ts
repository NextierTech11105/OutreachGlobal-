import { NextRequest, NextResponse } from "next/server";

/**
 * GIANNA AI VOICE WEBHOOK HANDLER
 *
 * Handles inbound calls with Gianna's personality-driven voice responses.
 *
 * Features:
 * - Warm greeting with Gianna's tone
 * - Speech recognition for property/business inquiries
 * - Voicemail with transcription
 * - Call routing based on caller interest
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app";
const FORWARD_NUMBER = process.env.FORWARD_PHONE_NUMBER || "+12125551234";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract Twilio webhook parameters
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const direction = formData.get("Direction") as string;

    console.log("[Gianna Voice] Inbound call:", { from, to, callSid, callStatus, direction });

    // Check if caller is in database to personalize
    let callerName = "";
    try {
      const lookupResponse = await fetch(`${APP_URL}/api/lookup/phone?phone=${encodeURIComponent(from)}`);
      if (lookupResponse.ok) {
        const data = await lookupResponse.json();
        callerName = data.firstName || "";
      }
    } catch (error) {
      console.log("[Gianna Voice] Caller lookup failed, continuing without personalization");
    }

    // Personalized greeting
    const personalGreeting = callerName
      ? `Hey ${callerName}! It's Gianna.`
      : `Hey there! This is Gianna.`;

    // Generate TwiML with Gianna's personality
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Warm Gianna greeting -->
  <Say voice="Polly.Joanna" language="en-US">
    ${escapeXml(personalGreeting)}
    Thanks for calling NexTier.
    I help business and property owners understand what they're really sitting on.
  </Say>

  <Pause length="1"/>

  <!-- First gather - Property or Business inquiry -->
  <Gather input="speech dtmf" timeout="5" speechTimeout="auto" numDigits="1" action="/api/gianna/voice-gather">
    <Say voice="Polly.Joanna">
      Quick question: Are you calling about a property, or is this about your business?
      Press 1 for property, press 2 for business, or just tell me what's on your mind.
    </Say>
  </Gather>

  <Pause length="1"/>

  <!-- No input - try again -->
  <Gather input="speech dtmf" timeout="4" speechTimeout="auto" numDigits="1" action="/api/gianna/voice-gather">
    <Say voice="Polly.Joanna">
      I didn't quite catch that. No worries.
      Press 1 if you're calling about a property.
      Press 2 if it's about your business.
      Or just say what you're looking for.
    </Say>
  </Gather>

  <Pause length="1"/>

  <!-- Still no input - offer to take a message or connect -->
  <Say voice="Polly.Joanna">
    Tell you what, let me connect you with Tommy directly.
    If he's not available, you can leave a message and we'll get right back to you.
  </Say>

  <!-- Try to forward to Tommy -->
  <Dial callerId="${to}" timeout="20" action="/api/gianna/call-complete">
    <Number>${FORWARD_NUMBER}</Number>
  </Dial>

  <!-- If no answer, take voicemail -->
  <Say voice="Polly.Joanna">
    Looks like Tommy stepped away. No problem.
    Leave your name, number, and a quick message about what you're looking for.
    We'll call you back within the hour.
  </Say>

  <Record maxLength="120" transcribe="true" transcribeCallback="/api/gianna/transcription" playBeep="true" />

  <Say voice="Polly.Joanna">
    Got it! We'll get back to you soon. Talk later!
  </Say>
</Response>`;

    console.log("[Gianna Voice] TwiML generated for:", from);

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("[Gianna Voice] Error:", error);

    // Fallback TwiML
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Hey, thanks for calling NexTier.
    We're experiencing a brief technical hiccup, but I'd hate for you to miss out.
    Leave a message with your name and number, and we'll call you right back.
  </Say>
  <Record maxLength="60" transcribe="true" transcribeCallback="/api/gianna/transcription" playBeep="true" />
  <Say voice="Polly.Joanna">
    Got it! Talk soon.
  </Say>
</Response>`;

    return new NextResponse(fallbackTwiml, {
      headers: { "Content-Type": "text/xml" },
    });
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
