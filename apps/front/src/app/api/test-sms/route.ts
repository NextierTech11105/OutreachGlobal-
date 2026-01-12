import { NextRequest, NextResponse } from "next/server";
import { sendSMS, isConfigured } from "@/lib/signalhouse";

/**
 * TEST SMS ENDPOINT
 *
 * Send a single test SMS to verify SignalHouse is working.
 *
 * POST /api/test-sms
 * Body: { to: "+15551234567", message: "Test message" }
 */

const SIGNALHOUSE_FROM_NUMBER =
  process.env.SIGNALHOUSE_FROM_NUMBER || "15164079249";

export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json();

    if (!to) {
      return NextResponse.json(
        { error: "Missing 'to' phone number" },
        { status: 400 },
      );
    }

    if (!isConfigured()) {
      return NextResponse.json(
        { error: "SignalHouse credentials not configured (SIGNALHOUSE_API_KEY or SIGNALHOUSE_AUTH_TOKEN)" },
        { status: 500 },
      );
    }

    if (!SIGNALHOUSE_FROM_NUMBER) {
      return NextResponse.json(
        { error: "SIGNALHOUSE_FROM_NUMBER not set" },
        { status: 500 },
      );
    }

    const result = await sendSMS({
      to,
      from: SIGNALHOUSE_FROM_NUMBER,
      message: message || "Test message from Nextier",
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to send SMS",
          correlationId: result.correlationId,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.data?.messageId,
      to,
      from: SIGNALHOUSE_FROM_NUMBER,
      correlationId: result.correlationId,
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
    configured: isConfigured(),
    fromNumber: SIGNALHOUSE_FROM_NUMBER,
    usage: "POST with { to: '+15551234567', message: 'Test' }",
  });
}
