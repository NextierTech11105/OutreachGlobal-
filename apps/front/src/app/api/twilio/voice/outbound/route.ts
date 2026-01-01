import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/twilio/voice/outbound
 *
 * TwiML webhook for outbound calls.
 * Twilio calls this URL when call is initiated to get instructions.
 */

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId") || "";
    const teamId = searchParams.get("teamId") || "";

    // Get form data from Twilio
    const formData = await request.formData().catch(() => new FormData());
    const to = (formData.get("To") as string) || "";
    const from = (formData.get("From") as string) || TWILIO_PHONE_NUMBER;
    const callSid = (formData.get("CallSid") as string) || "";

    console.log(
      `[Twilio Voice] Outbound call - To: ${to}, From: ${from}, CallSid: ${callSid}`,
    );

    // Generate TwiML response to connect the call
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${from}" timeout="30" action="/api/twilio/webhooks/call-status?leadId=${leadId}&amp;teamId=${teamId}">
    <Number>${to}</Number>
  </Dial>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("[Twilio Voice] Outbound error:", error);

    // Return error TwiML
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, there was an error connecting your call. Please try again.</Say>
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

// GET - Return basic info
export async function GET() {
  return NextResponse.json({
    endpoint: "Twilio Voice Outbound Webhook",
    description: "TwiML endpoint for outbound call instructions",
    method: "POST (called by Twilio)",
  });
}
