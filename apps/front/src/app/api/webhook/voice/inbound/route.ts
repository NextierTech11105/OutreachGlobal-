import { NextRequest, NextResponse } from "next/server";

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
    const payload: Record<string, string> = {};

    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    const callSid = payload.CallSid || `call_${Date.now()}`;
    const from = payload.From || "";
    const to = payload.To || "";
    const status = payload.CallStatus || "ringing";
    const direction = payload.Direction || "inbound";
    const callerName = payload.CallerName;

    console.log(`[Twilio Voice] Inbound call from ${from} to ${to} (${status})`);

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

    // TODO: Save to database
    // TODO: Look up lead by phone number
    // TODO: Route to appropriate agent

    // Return TwiML response - simple greeting with voicemail
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">
    Thank you for calling. We're currently assisting other customers.
    Please leave a message after the beep, and we'll return your call as soon as possible.
  </Say>
  <Record
    maxLength="120"
    action="/api/webhook/voice/recording"
    transcribe="true"
    transcribeCallback="/api/webhook/voice/transcription"
  />
  <Say voice="alice">
    We didn't receive a recording. Goodbye.
  </Say>
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
