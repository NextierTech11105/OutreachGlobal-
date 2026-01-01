import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/twilio/voice/inbound
 *
 * TwiML webhook for INBOUND calls.
 * When someone calls your Twilio number, this determines what happens.
 *
 * Set this URL in Twilio Console:
 * Phone Numbers → Your Number → Voice & Fax → "A Call Comes In" → Webhook
 */

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";

export async function POST(request: NextRequest) {
  try {
    // Parse Twilio webhook data
    const formData = await request.formData();

    const from = formData.get("From") as string || "";
    const to = formData.get("To") as string || "";
    const callSid = formData.get("CallSid") as string || "";
    const callStatus = formData.get("CallStatus") as string || "";

    console.log(`[Twilio Voice] INBOUND call from ${from} to ${to}`);
    console.log(`  CallSid: ${callSid}, Status: ${callStatus}`);

    // Look up who's calling (by phone number)
    // Could connect to leads database to get caller info
    const callerName = await lookupCaller(from);

    // Generate TwiML response
    // Options:
    // 1. Connect to browser client (Twilio.Device) - for click-to-answer in app
    // 2. Forward to another phone
    // 3. Play voicemail greeting

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. Please hold while we connect you.</Say>
  <Dial timeout="30" action="/api/twilio/webhooks/call-status">
    <Client>inbound-agent</Client>
  </Dial>
  <Say voice="alice">We're sorry, no one is available to take your call. Please leave a message after the beep.</Say>
  <Record maxLength="120" action="/api/twilio/webhooks/voicemail" transcribe="true" />
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("[Twilio Voice] Inbound error:", error);

    // Return error TwiML
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we're experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(errorTwiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}

// Look up caller by phone number
async function lookupCaller(phone: string): Promise<string | null> {
  // TODO: Query leads table by phone number
  // const lead = await db.select().from(leads).where(eq(leads.phone, phone)).limit(1);
  // if (lead.length > 0) return lead[0].firstName;
  console.log(`[Twilio] Looking up caller: ${phone}`);
  return null;
}

// GET - Return webhook info
export async function GET() {
  return NextResponse.json({
    endpoint: "Twilio Voice Inbound Webhook",
    description: "TwiML endpoint for incoming calls",
    setup: {
      step1: "Go to Twilio Console → Phone Numbers",
      step2: "Click your phone number",
      step3: "Under Voice & Fax → A Call Comes In",
      step4: "Set Webhook URL to: https://your-domain.com/api/twilio/voice/inbound",
    },
    method: "POST (called by Twilio)",
  });
}
