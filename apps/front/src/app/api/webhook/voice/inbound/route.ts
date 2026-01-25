import { NextRequest, NextResponse } from "next/server";
import {
  validateTwilioWebhook,
  forbiddenResponse,
} from "@/lib/twilio/validate-webhook";

// Twilio Voice Webhook - Handles inbound calls
// Configure in Twilio Console: Voice Request URL

interface TwilioVoicePayload {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  ForwardedFrom?: string;
  CallerName?: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToZip?: string;
  ToCountry?: string;
}

// Store recent calls (in production, save to DB)
const recentCalls: Array<{
  callSid: string;
  from: string;
  to: string;
  status: string;
  direction: string;
  callerName?: string;
  receivedAt: string;
}> = [];

// GET - Retrieve recent calls
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");

  return NextResponse.json({
    success: true,
    count: recentCalls.length,
    calls: recentCalls.slice(0, limit),
  });
}

// POST - Handle incoming Twilio voice webhook
export async function POST(request: NextRequest) {
  try {
    // Twilio sends form-urlencoded data
    const formData = await request.formData();

    // Validate Twilio signature
    const validation = validateTwilioWebhook(request, formData);
    if (!validation.isValid) {
      console.warn("[Twilio Voice] Rejected:", validation.error);
      return forbiddenResponse(validation.error);
    }

    const payload = validation.params!;
    const callSid = payload.CallSid || `call_${Date.now()}`;
    const from = payload.From || "";
    const to = payload.To || "";
    const status = payload.CallStatus || "ringing";
    const direction = payload.Direction || "inbound";
    const callerName = payload.CallerName;

    console.log(
      `[Twilio Voice] Inbound call from ${from} to ${to} (${status})`,
    );

    // Store the call
    recentCalls.unshift({
      callSid,
      from,
      to,
      status,
      direction,
      callerName,
      receivedAt: new Date().toISOString(),
    });

    if (recentCalls.length > 100) {
      recentCalls.pop();
    }

    // Route call to browser-based Twilio Client
    // Dial connected inbound agents - first to answer gets the call
    // Fallback to voicemail if no answer after 30 seconds
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" action="/api/webhook/voice/status" callerId="${to}">
    <Client>
      <Identity>inbound-agent</Identity>
      <Parameter name="From" value="${from}"/>
      <Parameter name="CallerName" value="${callerName || "Unknown"}"/>
    </Client>
  </Dial>
  <Say voice="alice">
    Thank you for calling. Our team is currently unavailable.
    Please leave a message after the beep.
  </Say>
  <Record
    maxLength="120"
    action="/api/webhook/voice/recording"
    transcribe="true"
    transcribeCallback="/api/webhook/voice/transcription"
    playBeep="true"
  />
  <Say voice="alice">
    We didn't receive a recording. Thank you for calling.
  </Say>
  <Hangup/>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
      },
    });
  } catch (error: any) {
    console.error("[Twilio Voice] Error:", error);

    // Return error TwiML
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">
    We're experiencing technical difficulties. Please try again later.
  </Say>
  <Hangup/>
</Response>`;

    return new NextResponse(errorTwiml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
      },
    });
  }
}
