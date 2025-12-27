import { NextRequest, NextResponse } from "next/server";
import { sendSMS } from "@/lib/signalhouse/client";

// Auto-response messages for missed calls
const MISSED_CALL_RESPONSES = [
  "Hey! I saw you called - I'm driving right now but wanted to reach out. I'll call you back when I'm off the road!",
  "Hi there! Missed your call - I'm in the middle of something but didn't want to leave you hanging. Will call you back shortly!",
  "Hey! Sorry I missed your call. I'm tied up at the moment but I'll give you a ring as soon as I'm free!",
];

function getRandomMissedCallMessage(): string {
  return MISSED_CALL_RESPONSES[
    Math.floor(Math.random() * MISSED_CALL_RESPONSES.length)
  ];
}

/**
 * POST /api/webhook/voice/status
 * Handle Twilio dial action status callbacks
 * Called after a Dial verb completes
 * Auto-SMS via SignalHouse when call not answered
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const payload: Record<string, string> = {};

    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    const callSid = payload.CallSid || "";
    const dialCallStatus = payload.DialCallStatus || "";
    const dialCallDuration = payload.DialCallDuration || "0";
    const from = payload.From || "";
    const to = payload.To || ""; // The Twilio number that was called

    console.log(
      `[Voice Status] Call ${callSid} - Dial status: ${dialCallStatus}, Duration: ${dialCallDuration}s`,
    );

    // If call was answered and completed, just acknowledge
    if (dialCallStatus === "completed") {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        },
      );
    }

    // Call was not answered (busy, no-answer, failed, canceled)
    // Send auto-SMS via SignalHouse to let caller know we'll call back
    if (
      from &&
      to &&
      (dialCallStatus === "no-answer" ||
        dialCallStatus === "busy" ||
        dialCallStatus === "canceled")
    ) {
      try {
        const message = getRandomMissedCallMessage();

        // Send SMS via SignalHouse (from = our number, to = caller's number)
        const smsResult = await sendSMS({
          from: to, // Our Twilio/SignalHouse number
          to: from, // Caller's number
          message,
        });

        if (smsResult.success) {
          console.log(
            `[Voice Status] Auto-SMS sent to ${from}: ${smsResult.data?.messageId}`,
          );
        } else {
          console.warn(`[Voice Status] Auto-SMS failed: ${smsResult.error}`);
        }
      } catch (smsError) {
        console.error("[Voice Status] Auto-SMS error:", smsError);
        // Don't fail the webhook if SMS fails
      }
    }

    // Return empty response to let original TwiML flow continue to voicemail
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      },
    );
  } catch (error) {
    console.error("[Voice Status] Error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      },
    );
  }
}
