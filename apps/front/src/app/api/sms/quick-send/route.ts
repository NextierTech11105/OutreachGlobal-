/**
 * Quick Send SMS - Direct to SignalHouse, No Templates
 * POST /api/sms/quick-send
 */

import { NextRequest, NextResponse } from "next/server";
import { sendSMS, isConfigured } from "@/lib/signalhouse";

export async function POST(request: NextRequest) {
  try {
    if (!isConfigured()) {
      return NextResponse.json({ error: "SignalHouse not configured" }, { status: 503 });
    }

    const { to, message, from } = await request.json();

    if (!to) {
      return NextResponse.json({ error: "Missing 'to' phone number" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "Missing 'message'" }, { status: 400 });
    }

    const fromNumber = from || process.env.SIGNALHOUSE_FROM_NUMBER || process.env.GIANNA_PHONE_NUMBER;
    if (!fromNumber) {
      return NextResponse.json({ error: "No from number configured" }, { status: 500 });
    }

    const result = await sendSMS({ to, from: fromNumber, message });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Send failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.data?.messageId,
    });
  } catch (error) {
    console.error("[Quick Send] Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Send failed",
    }, { status: 500 });
  }
}
