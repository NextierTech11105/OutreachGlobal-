import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callHistories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * No-Answer Webhook
 *
 * Called when inbound call isn't answered by agent within timeout.
 * Offers to take a message or try again.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = String(value);
    });

    console.log("[No-Answer Webhook] Received:", data);

    const callSid = data.CallSid;
    const dialCallStatus = data.DialCallStatus; // "no-answer", "busy", "failed", "completed"

    // Update call status in database
    if (callSid) {
      try {
        await db
          .update(callHistories)
          .set({
            status: dialCallStatus === "completed" ? "completed" : "missed",
            updatedAt: new Date(),
          })
          .where(eq(callHistories.twilioSid, callSid));
      } catch (dbError) {
        console.error("[No-Answer Webhook] DB update error:", dbError);
      }
    }

    // If agent didn't answer, offer voicemail
    if (dialCallStatus !== "completed") {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, all agents are currently busy. Please leave a message after the beep, or press 1 to try again.</Say>
  <Record maxLength="120" action="${process.env.NEXT_PUBLIC_APP_URL || ""}/api/webhook/twilio/voicemail" transcribe="true" />
</Response>`;

      return new NextResponse(twiml, {
        headers: { "Content-Type": "application/xml" },
      });
    }

    // Call completed successfully
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    console.error("[No-Answer Webhook] Error:", error);

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. Goodbye.</Say>
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
    type: "twilio-no-answer-webhook",
    description: "Handles missed inbound calls, offers voicemail",
  });
}
