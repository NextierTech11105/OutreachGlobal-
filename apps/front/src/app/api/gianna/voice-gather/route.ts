import { NextRequest, NextResponse } from "next/server";
import { gianna, classifyResponse, type GiannaContext } from "@/lib/gianna/gianna-service";

/**
 * GIANNA VOICE GATHER HANDLER
 *
 * Processes speech input from Gianna voice calls and generates
 * personality-driven responses using the full DNA system.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app";
const FORWARD_NUMBER = process.env.FORWARD_PHONE_NUMBER || "+12125551234";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract parameters
    const speechResult = formData.get("SpeechResult") as string;
    const digits = formData.get("Digits") as string;
    const confidence = formData.get("Confidence") as string;
    const from = formData.get("From") as string;
    const callSid = formData.get("CallSid") as string;

    console.log("[Gianna Voice Gather]", {
      speechResult,
      digits,
      confidence,
      from
    });

    // Handle DTMF input (button presses)
    if (digits) {
      return handleDTMF(digits, from);
    }

    // No speech detected
    if (!speechResult) {
      return twimlResponse(`
        <Say voice="Polly.Joanna">I didn't quite catch that. No worries, let me connect you with Tommy directly.</Say>
        <Dial callerId="${from}" timeout="20" action="/api/gianna/call-complete">
          <Number>${FORWARD_NUMBER}</Number>
        </Dial>
        <Say voice="Polly.Joanna">Tommy's not available right now. Leave a quick message and we'll call you right back.</Say>
        <Record maxLength="120" transcribe="true" transcribeCallback="/api/gianna/transcription" playBeep="true" />
      `);
    }

    // Classify the speech intent
    const classification = classifyResponse(speechResult);
    console.log("[Gianna Voice] Intent classification:", classification);

    // Build context for Gianna
    const context: GiannaContext = {
      phone: from,
      channel: "voice",
      stage: "warming_up",
      messageNumber: 1,
    };

    // ═════════════════════════════════════════════════
    // HANDLE SPECIFIC INTENTS
    // ═════════════════════════════════════════════════

    // Wants to talk to a human
    if (wantsHuman(speechResult)) {
      console.log("[Gianna Voice] Caller wants human, forwarding...");
      return twimlResponse(`
        <Say voice="Polly.Joanna">Absolutely! Let me get Tommy on the line for you.</Say>
        <Dial callerId="${from}" timeout="30" action="/api/gianna/call-complete">
          <Number>${FORWARD_NUMBER}</Number>
        </Dial>
        <Say voice="Polly.Joanna">Tommy's with another client right now. Leave your name and number and he'll call you back within the hour.</Say>
        <Record maxLength="120" transcribe="true" transcribeCallback="/api/gianna/transcription" playBeep="true" />
      `);
    }

    // Interested in property valuation
    if (classification.intent === "interested" || wantsValuation(speechResult)) {
      console.log("[Gianna Voice] Caller interested in valuation");

      // Log the hot lead for callback
      await logHotLead(from, speechResult, "valuation_interest");

      return twimlResponse(`
        <Say voice="Polly.Joanna">
          Love to hear it. We can definitely help you understand what you're sitting on.
          Quick question though - are we talking about a property you own, or a business?
        </Say>
        <Gather input="speech dtmf" timeout="5" speechTimeout="auto" action="/api/gianna/voice-gather">
          <Say voice="Polly.Joanna">
            Press 1 or say property. Press 2 or say business.
          </Say>
        </Gather>
        <Say voice="Polly.Joanna">
          Tell you what, I'll have Tommy call you back to get the details. He's the expert.
          We'll reach out within the hour. Talk soon!
        </Say>
      `);
    }

    // Property inquiry
    if (isPropertyInquiry(speechResult)) {
      console.log("[Gianna Voice] Property inquiry detected");

      await logHotLead(from, speechResult, "property_inquiry");

      return twimlResponse(`
        <Say voice="Polly.Joanna">
          Got it - property stuff. That's my specialty.
          Here's what I can do: I'll pull together a quick analysis showing what your property is worth in today's market.
          All I need is the address. What's the property address?
        </Say>
        <Gather input="speech" timeout="8" speechTimeout="auto" action="/api/gianna/voice-gather">
          <Say voice="Polly.Joanna">Just say the street address and city.</Say>
        </Gather>
        <Say voice="Polly.Joanna">
          No problem. We'll follow up to get the details. Thanks for calling!
        </Say>
      `);
    }

    // Business inquiry
    if (isBusinessInquiry(speechResult)) {
      console.log("[Gianna Voice] Business inquiry detected");

      await logHotLead(from, speechResult, "business_inquiry");

      return twimlResponse(`
        <Say voice="Polly.Joanna">
          Business owner, nice!
          So here's the deal - I help business owners figure out what their company is actually worth.
          Not a guess, real numbers based on what buyers are paying right now.
          It's free, takes 15 minutes, and you'll know exactly where you stand.
          Want me to have Tommy call you to set that up?
        </Say>
        <Gather input="speech dtmf" timeout="5" speechTimeout="auto" action="/api/gianna/voice-gather">
          <Say voice="Polly.Joanna">Say yes or press 1, or say no if you're not interested.</Say>
        </Gather>
        <Say voice="Polly.Joanna">
          Alright, we'll be in touch. Have a great day!
        </Say>
      `);
    }

    // Opt-out / Not interested
    if (classification.intent === "opt_out" || classification.intent === "hard_no") {
      return twimlResponse(`
        <Say voice="Polly.Joanna">
          No problem at all. Thanks for letting me know. Take care!
        </Say>
      `);
    }

    // Question - generate AI response
    if (classification.intent === "question") {
      const giannaResponse = await gianna.generateResponse(speechResult, context);

      return twimlResponse(`
        <Say voice="Polly.Joanna">${escapeXml(giannaResponse.message)}</Say>
        <Gather input="speech dtmf" timeout="5" speechTimeout="auto" action="/api/gianna/voice-gather">
          <Say voice="Polly.Joanna">Anything else I can help with?</Say>
        </Gather>
        <Say voice="Polly.Joanna">Alright, thanks for calling NexTier. Talk soon!</Say>
      `);
    }

    // Default - address capture or general response
    if (looksLikeAddress(speechResult)) {
      console.log("[Gianna Voice] Address captured:", speechResult);

      await logPropertyAddress(from, speechResult);

      return twimlResponse(`
        <Say voice="Polly.Joanna">
          Got it - ${escapeXml(speechResult)}. Let me run some numbers on that.
          I'll text you a link to your property analysis within the next 30 minutes.
          Make sure to check your texts. Anything else before you go?
        </Say>
        <Gather input="speech dtmf" timeout="4" speechTimeout="auto" action="/api/gianna/voice-gather">
          <Say voice="Polly.Joanna">Press any key or just say if you have another question.</Say>
        </Gather>
        <Say voice="Polly.Joanna">Perfect! Watch for that text. Talk later!</Say>
      `);
    }

    // Fallback - generate contextual response
    const giannaResponse = await gianna.generateResponse(speechResult, context);

    return twimlResponse(`
      <Say voice="Polly.Joanna">${escapeXml(giannaResponse.message)}</Say>
      <Gather input="speech dtmf" timeout="5" speechTimeout="auto" action="/api/gianna/voice-gather">
        <Say voice="Polly.Joanna">Was there something specific you wanted to know about?</Say>
      </Gather>
      <Say voice="Polly.Joanna">Thanks for calling NexTier. Have a great one!</Say>
    `);

  } catch (error) {
    console.error("[Gianna Voice Gather] Error:", error);
    return twimlResponse(`
      <Say voice="Polly.Joanna">
        Oops, hit a little snag on my end. Let me connect you with Tommy.
      </Say>
      <Dial timeout="20">
        <Number>${FORWARD_NUMBER}</Number>
      </Dial>
      <Say voice="Polly.Joanna">Sorry about that. Leave a message and we'll call you right back.</Say>
      <Record maxLength="60" transcribe="true" transcribeCallback="/api/gianna/transcription" />
    `);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function handleDTMF(digits: string, from: string): NextResponse {
  switch (digits) {
    case "1":
      // Property
      return twimlResponse(`
        <Say voice="Polly.Joanna">Property it is. What's the address you want valued?</Say>
        <Gather input="speech" timeout="8" speechTimeout="auto" action="/api/gianna/voice-gather">
          <Say voice="Polly.Joanna">Just say the street address and city.</Say>
        </Gather>
        <Say voice="Polly.Joanna">No problem. We'll follow up to get the details. Thanks!</Say>
      `);

    case "2":
      // Business
      return twimlResponse(`
        <Say voice="Polly.Joanna">
          Business valuation, perfect. We do a 15-minute strategy session - totally free.
          Want me to have Tommy give you a call to set that up?
        </Say>
        <Gather input="speech dtmf" timeout="5" speechTimeout="auto" action="/api/gianna/voice-gather">
          <Say voice="Polly.Joanna">Say yes or press 1 to confirm.</Say>
        </Gather>
        <Say voice="Polly.Joanna">Got it. We'll be in touch. Thanks for calling!</Say>
      `);

    default:
      return twimlResponse(`
        <Say voice="Polly.Joanna">Let me connect you with a team member.</Say>
        <Dial timeout="20">
          <Number>${FORWARD_NUMBER}</Number>
        </Dial>
      `);
  }
}

function wantsHuman(speech: string): boolean {
  const lower = speech.toLowerCase();
  return (
    lower.includes("representative") ||
    lower.includes("person") ||
    lower.includes("human") ||
    lower.includes("agent") ||
    lower.includes("speak to someone") ||
    lower.includes("talk to someone") ||
    lower.includes("real person") ||
    lower.includes("tommy")
  );
}

function wantsValuation(speech: string): boolean {
  const lower = speech.toLowerCase();
  return (
    lower.includes("valuation") ||
    lower.includes("value") ||
    lower.includes("worth") ||
    lower.includes("appraisal") ||
    lower.includes("how much") ||
    lower.includes("what can i get") ||
    lower.includes("sell") ||
    lower.includes("selling")
  );
}

function isPropertyInquiry(speech: string): boolean {
  const lower = speech.toLowerCase();
  return (
    lower.includes("property") ||
    lower.includes("house") ||
    lower.includes("home") ||
    lower.includes("real estate") ||
    lower.includes("land") ||
    lower.includes("apartment") ||
    lower.includes("condo") ||
    lower.includes("building")
  );
}

function isBusinessInquiry(speech: string): boolean {
  const lower = speech.toLowerCase();
  return (
    lower.includes("business") ||
    lower.includes("company") ||
    lower.includes("shop") ||
    lower.includes("store") ||
    lower.includes("enterprise") ||
    lower.includes("my firm")
  );
}

function looksLikeAddress(speech: string): boolean {
  // Simple heuristic for address detection
  const hasNumber = /\d+/.test(speech);
  const hasStreetWord = /\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|boulevard|blvd)\b/i.test(speech);
  return hasNumber && hasStreetWord;
}

async function logHotLead(phone: string, transcript: string, type: string): Promise<void> {
  try {
    await fetch(`${APP_URL}/api/leads/hot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        transcript,
        type,
        source: "voice_call",
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("[Gianna Voice] Failed to log hot lead:", error);
  }
}

async function logPropertyAddress(phone: string, address: string): Promise<void> {
  try {
    await fetch(`${APP_URL}/api/property/from-voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        address,
        source: "voice_call",
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("[Gianna Voice] Failed to log property address:", error);
  }
}

function twimlResponse(content: string): NextResponse {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
${content}
</Response>`;
  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
