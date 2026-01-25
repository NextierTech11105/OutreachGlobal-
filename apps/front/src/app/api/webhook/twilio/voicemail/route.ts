import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callHistories, callRecordings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  validateTwilioWebhook,
  forbiddenResponse,
} from "@/lib/twilio/validate-webhook";

/**
 * Voicemail Webhook
 *
 * Called when a caller leaves a voicemail after agent didn't answer.
 * Saves the recording URL and transcription.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Validate Twilio signature
    const validation = validateTwilioWebhook(request, formData);
    if (!validation.isValid) {
      console.warn("[Voicemail Webhook] Rejected:", validation.error);
      return forbiddenResponse(validation.error);
    }

    const data = validation.params!;
    console.log("[Voicemail Webhook] Received:", data);

    const callSid = data.CallSid;
    const recordingUrl = data.RecordingUrl;
    const recordingSid = data.RecordingSid;
    const recordingDuration = data.RecordingDuration;
    const transcriptionText = data.TranscriptionText;

    // Save voicemail recording
    if (callSid && recordingUrl) {
      try {
        // Find the call history record
        const callHistory = await db
          .select({ id: callHistories.id, leadId: callHistories.leadId })
          .from(callHistories)
          .where(eq(callHistories.twilioSid, callSid))
          .limit(1);

        if (callHistory.length > 0) {
          // Save recording
          await db.insert(callRecordings).values({
            id: crypto.randomUUID(),
            callHistoryId: callHistory[0].id,
            recordingUrl: recordingUrl,
            recordingSid: recordingSid,
            duration: recordingDuration
              ? parseInt(recordingDuration, 10)
              : null,
            transcription: transcriptionText || null,
            createdAt: new Date(),
          });

          // Update call status to voicemail
          await db
            .update(callHistories)
            .set({
              status: "voicemail",
              updatedAt: new Date(),
            })
            .where(eq(callHistories.id, callHistory[0].id));

          console.log("[Voicemail Webhook] Saved voicemail for call:", callSid);
        }
      } catch (dbError) {
        console.error("[Voicemail Webhook] DB error:", dbError);
      }
    }

    // Thank the caller and hang up
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for your message. We will get back to you as soon as possible. Goodbye.</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    console.error("[Voicemail Webhook] Error:", error);

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
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
    type: "twilio-voicemail-webhook",
    description: "Saves voicemail recordings and transcriptions",
  });
}
