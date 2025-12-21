import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callHistories, messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Handle Twilio voice webhooks
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = String(value);
    });

    console.log("[Twilio Webhook] Received:", data);

    const callSid = data.CallSid;
    const callStatus = data.CallStatus;
    const direction = data.Direction;
    const from = data.From;
    const to = data.To;
    const duration = data.CallDuration;

    // Update call history if we have a record
    if (callSid) {
      try {
        await db
          .update(callHistories)
          .set({
            status: callStatus || "unknown",
            duration: duration ? parseInt(duration, 10) : null,
            updatedAt: new Date(),
          })
          .where(eq(callHistories.twilioSid, callSid));
      } catch (dbError) {
        console.error("[Twilio Webhook] DB update error:", dbError);
      }
    }

    // Return TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hello, this is a call from Nextier Platform. Please hold while we connect you.</Say>
  <Dial callerId="${from || process.env.TWILIO_PHONE_NUMBER}">
    <Number>${to}</Number>
  </Dial>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    console.error("[Twilio Webhook] Error:", error);

    // Return valid TwiML even on error
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, there was an error processing your call. Please try again later.</Say>
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
    type: "twilio-voice-webhook",
    endpoints: {
      voice: "POST /api/webhook/twilio",
      sms: "POST /api/webhook/sms/inbound",
    },
    configured: !!(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ),
  });
}
