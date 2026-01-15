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
  process.env.SIGNALHOUSE_FROM_NUMBER || "+15164079249";

/**
 * Normalize phone number to E164 format
 * Handles: 7187175127, 17187175127, +17187175127
 */
function normalizeToE164(phone: string): string {
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Already in E164 format
  if (cleaned.startsWith("+1") && cleaned.length === 12) {
    return cleaned;
  }

  // Has + but wrong format
  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  // 10 digit US number (no country code)
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // 11 digit US number (with country code, no +)
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+${cleaned}`;
  }

  // Return as-is with + prefix if nothing matches
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json();

    if (!to) {
      return NextResponse.json(
        { error: "Missing 'to' phone number" },
        { status: 400 },
      );
    }

    // Normalize to E164 format
    const normalizedTo = normalizeToE164(to);

    if (!isConfigured()) {
      return NextResponse.json(
        {
          error:
            "SignalHouse credentials not configured (SIGNALHOUSE_API_KEY or SIGNALHOUSE_AUTH_TOKEN)",
        },
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
      to: normalizedTo,
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
      to: normalizedTo,
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
