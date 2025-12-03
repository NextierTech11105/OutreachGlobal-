import { NextRequest, NextResponse } from "next/server";

// Twilio SMS Webhook - Handles inbound SMS messages
// Configure in Twilio Console: Messaging Request URL

interface TwilioSmsPayload {
  MessageSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  NumSegments: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToZip?: string;
  ToCountry?: string;
}

// Store recent messages (in production, save to DB)
const recentSmsMessages: Array<{
  messageSid: string;
  from: string;
  to: string;
  body: string;
  numMedia: number;
  receivedAt: string;
}> = [];

// GET - Retrieve recent SMS messages
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");

  return NextResponse.json({
    success: true,
    count: recentSmsMessages.length,
    messages: recentSmsMessages.slice(0, limit),
  });
}

// POST - Handle incoming Twilio SMS webhook
export async function POST(request: NextRequest) {
  try {
    // Twilio sends form-urlencoded data
    const formData = await request.formData();
    const payload: Record<string, string> = {};

    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    const messageSid = payload.MessageSid || `sms_${Date.now()}`;
    const from = payload.From || "";
    const to = payload.To || "";
    const body = payload.Body || "";
    const numMedia = parseInt(payload.NumMedia || "0");

    console.log(`[Twilio SMS] Inbound from ${from}: ${body}`);

    // Store the message
    recentSmsMessages.unshift({
      messageSid,
      from,
      to,
      body,
      numMedia,
      receivedAt: new Date().toISOString(),
    });

    if (recentSmsMessages.length > 100) {
      recentSmsMessages.pop();
    }

    // TODO: Save to database
    // TODO: Look up lead by phone number
    // TODO: Update lead activity
    // TODO: Trigger auto-response if configured

    // Check for opt-out keywords
    const optOutKeywords = ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
    const isOptOut = optOutKeywords.some((kw) =>
      body.toUpperCase().trim() === kw
    );

    if (isOptOut) {
      console.log(`[Twilio SMS] Opt-out received from ${from}`);
      // TODO: Mark lead as opted-out

      // Return TwiML with opt-out confirmation
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    You have been unsubscribed and will no longer receive messages from us. Reply START to re-subscribe.
  </Message>
</Response>`;

      return new NextResponse(twiml, {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      });
    }

    // Check for opt-in keywords
    const optInKeywords = ["START", "YES", "SUBSCRIBE"];
    const isOptIn = optInKeywords.some((kw) =>
      body.toUpperCase().trim() === kw
    );

    if (isOptIn) {
      console.log(`[Twilio SMS] Opt-in received from ${from}`);
      // TODO: Mark lead as opted-in

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    Thanks for subscribing! You'll now receive updates from us. Reply STOP at any time to unsubscribe.
  </Message>
</Response>`;

      return new NextResponse(twiml, {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      });
    }

    // For other messages, send acknowledgment
    // In production: queue for human review or AI response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    Thanks for your message! A team member will get back to you shortly.
  </Message>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error: any) {
    console.error("[Twilio SMS] Error:", error);

    // Return empty response on error (don't send anything to user)
    return new NextResponse("", { status: 200 });
  }
}
