import { NextRequest, NextResponse } from "next/server";

/**
 * GIANNA CALL COMPLETE HANDLER
 *
 * Called when a forwarded call ends or times out.
 * Handles voicemail fallback and call logging.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract dial status info
    const dialCallStatus = formData.get("DialCallStatus") as string;
    const dialCallSid = formData.get("DialCallSid") as string;
    const dialCallDuration = formData.get("DialCallDuration") as string;
    const callSid = formData.get("CallSid") as string;
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;

    console.log("[Gianna Call Complete]", {
      dialCallStatus,
      dialCallDuration,
      from,
    });

    // Log call outcome
    await logCallOutcome({
      callSid,
      dialCallSid,
      from,
      to,
      status: dialCallStatus,
      duration: parseInt(dialCallDuration || "0"),
    });

    // Handle based on dial status
    switch (dialCallStatus) {
      case "completed":
        // Call was answered and completed
        return twimlResponse(`
          <Say voice="Polly.Joanna">
            Thank you for speaking with us! We'll follow up with any additional info via text.
            Have a great day!
          </Say>
        `);

      case "busy":
        return twimlResponse(`
          <Say voice="Polly.Joanna">
            Tommy's line is busy right now. No worries, leave a quick message and he'll call you right back.
          </Say>
          <Record maxLength="120" transcribe="true" transcribeCallback="/api/gianna/transcription" playBeep="true" />
          <Say voice="Polly.Joanna">Got it! Tommy will call you back shortly. Thanks!</Say>
        `);

      case "no-answer":
        return twimlResponse(`
          <Say voice="Polly.Joanna">
            Tommy didn't pick up, but don't worry. Leave your name, number, and what you're looking for, and he'll call you back within the hour.
          </Say>
          <Record maxLength="120" transcribe="true" transcribeCallback="/api/gianna/transcription" playBeep="true" />
          <Say voice="Polly.Joanna">Perfect! We'll get back to you soon. Talk later!</Say>
        `);

      case "failed":
        return twimlResponse(`
          <Say voice="Polly.Joanna">
            We're having some trouble with the connection. Leave a message with your info and we'll call you right back.
          </Say>
          <Record maxLength="120" transcribe="true" transcribeCallback="/api/gianna/transcription" playBeep="true" />
          <Say voice="Polly.Joanna">Got it! We'll reach out shortly. Thanks for your patience!</Say>
        `);

      case "canceled":
        // Caller hung up before forward connected
        return twimlResponse(`<Hangup />`);

      default:
        return twimlResponse(`
          <Say voice="Polly.Joanna">
            Thanks for calling! Leave a message and we'll get back to you.
          </Say>
          <Record maxLength="120" transcribe="true" transcribeCallback="/api/gianna/transcription" playBeep="true" />
          <Say voice="Polly.Joanna">Got it! Talk soon!</Say>
        `);
    }

  } catch (error) {
    console.error("[Gianna Call Complete] Error:", error);
    return twimlResponse(`
      <Say voice="Polly.Joanna">Thanks for calling. We'll follow up with you soon!</Say>
      <Hangup />
    `);
  }
}

async function logCallOutcome(data: {
  callSid: string;
  dialCallSid: string;
  from: string;
  to: string;
  status: string;
  duration: number;
}): Promise<void> {
  try {
    await fetch(`${APP_URL}/api/calls/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        type: "inbound_forward",
        completedAt: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("[Gianna Call Complete] Failed to log call:", error);
  }
}

function twimlResponse(content: string): NextResponse {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
${content}
</Response>`;
  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}
