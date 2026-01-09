import { NextRequest, NextResponse } from "next/server";

/**
 * TEST SMS ENDPOINT
 *
 * Send a single test SMS to verify SignalHouse is working.
 *
 * POST /api/test-sms
 * Body: { to: "+15551234567", message: "Test message" }
 */

const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const SIGNALHOUSE_FROM_NUMBER =
  process.env.SIGNALHOUSE_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER || "";

export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json();

    if (!to) {
      return NextResponse.json(
        { error: "Missing 'to' phone number" },
        { status: 400 },
      );
    }

    if (!SIGNALHOUSE_API_KEY) {
      return NextResponse.json(
        { error: "SIGNALHOUSE_API_KEY not set" },
        { status: 500 },
      );
    }

    if (!SIGNALHOUSE_FROM_NUMBER) {
      return NextResponse.json(
        { error: "SIGNALHOUSE_FROM_NUMBER not set" },
        { status: 500 },
      );
    }

    const response = await fetch(
      "https://api.signalhouse.io/api/v1/message/sendSMS",
      {
        method: "POST",
        headers: {
          "x-api-key": SIGNALHOUSE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          from: SIGNALHOUSE_FROM_NUMBER,
          message: message || "Test message from Nextier",
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.message || `HTTP ${response.status}`,
          details: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      messageId: data.messageId || data.id || data.sid,
      to,
      from: SIGNALHOUSE_FROM_NUMBER,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ready",
    signalhouseKeySet: !!SIGNALHOUSE_API_KEY,
    fromNumberSet: !!SIGNALHOUSE_FROM_NUMBER,
    usage: "POST with { to: '+15551234567', message: 'Test' }",
  });
}
