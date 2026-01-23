/**
 * SMS Send API - Direct send via SignalHouse
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { sendSMS, isConfigured } from "@/lib/signalhouse";

export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isConfigured()) {
      return NextResponse.json(
        { error: "SignalHouse not configured. Set SIGNALHOUSE_API_KEY." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { to, message, from } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: "to and message are required" },
        { status: 400 }
      );
    }

    // Use provided from number or default
    const fromNumber = from || process.env.SIGNALHOUSE_FROM_NUMBER || "";
    if (!fromNumber) {
      return NextResponse.json(
        { error: "No from number configured. Set SIGNALHOUSE_FROM_NUMBER." },
        { status: 400 }
      );
    }

    // Send via SignalHouse
    const result = await sendSMS({
      to,
      from: fromNumber,
      message,
    });

    if (result.success) {
      console.log(`[SMS] Sent to ${to} from ${fromNumber}`);
      return NextResponse.json({
        success: true,
        messageId: result.data?.messageId,
        to,
        from: fromNumber,
      });
    } else {
      console.error(`[SMS] Failed to ${to}:`, result.error);
      return NextResponse.json(
        { success: false, error: result.error || "Send failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[SMS Send] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Send failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const configured = isConfigured();
  const fromNumber = process.env.SIGNALHOUSE_FROM_NUMBER;

  return NextResponse.json({
    endpoint: "POST /api/sms/send",
    configured,
    fromNumber: fromNumber ? `${fromNumber.slice(0, 6)}...` : null,
    params: {
      to: "Phone number to send to (required)",
      message: "SMS message content (required)",
      from: "From number (optional, uses default)",
    },
  });
}
