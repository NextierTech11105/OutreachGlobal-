import { NextRequest, NextResponse } from "next/server";

/**
 * Outbound Call Webhook
 *
 * When Twilio initiates an outbound call (from call queue),
 * this webhook returns TwiML to connect the lead to the browser client.
 *
 * Flow:
 * 1. Call queue initiates call to lead via Twilio REST API
 * 2. Lead answers → Twilio hits this webhook
 * 3. We return TwiML that connects to browser client (agent)
 * 4. Agent hears lead, lead hears agent
 */

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId") || "unknown";
    const persona = searchParams.get("persona") || "gianna";

    const formData = await request.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = String(value);
    });

    console.log("[Outbound Webhook] Call answered:", {
      leadId,
      persona,
      callSid: data.CallSid,
      callStatus: data.CallStatus,
    });

    // TwiML to connect the answered call to the browser client
    // The browser client is identified by "inbound-agent" identity
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Client>inbound-agent</Client>
  </Dial>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    console.error("[Outbound Webhook] Error:", error);

    // Return hangup on error
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, there was an error connecting your call.</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(errorTwiml, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    type: "twilio-outbound-webhook",
    description: "Handles outbound call connections from call queue",
  });
}
