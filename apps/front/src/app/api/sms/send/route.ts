/**
 * SMS SEND API - Send SMS via SignalHouse
 *
 * POST /api/sms/send
 * Body: { to: string, message: string, from?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { sendSMS, isConfigured } from "@/lib/signalhouse/client";

// Default from number from env
const DEFAULT_FROM = process.env.SIGNALHOUSE_FROM_NUMBER || process.env.DEFAULT_OUTBOUND_NUMBER || "";

export async function POST(request: NextRequest) {
  try {
    // Check SignalHouse credentials
    if (!isConfigured()) {
      return NextResponse.json(
        { error: "SignalHouse not configured", message: "Missing API credentials" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { to, message, from } = body;

    if (!to) {
      return NextResponse.json(
        { error: "Missing 'to' phone number", message: "Phone number is required" },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "Missing 'message'", message: "Message text is required" },
        { status: 400 }
      );
    }

    // Normalize phone number
    const toNumber = normalizePhone(to);
    const fromNumber = from || DEFAULT_FROM;

    if (!fromNumber) {
      return NextResponse.json(
        { error: "No from number configured", message: "Set SIGNALHOUSE_FROM_NUMBER env var" },
        { status: 500 }
      );
    }

    console.log(`[SMS Send] Sending to ${toNumber} from ${fromNumber}`);

    // Send via SignalHouse
    const result = await sendSMS({
      to: toNumber,
      from: fromNumber,
      message: message,
    });

    if (!result.success) {
      console.error(`[SMS Send] Failed: ${result.error}`);
      return NextResponse.json(
        { error: result.error, message: result.error },
        { status: 400 }
      );
    }

    console.log(`[SMS Send] Success: ${result.data?.messageId}`);

    return NextResponse.json({
      success: true,
      messageId: result.data?.messageId,
      to: toNumber,
      from: fromNumber,
      status: result.data?.status,
    });
  } catch (error) {
    console.error("[SMS Send] Error:", error);
    return NextResponse.json(
      { error: "Failed to send SMS", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;
  if (cleaned.startsWith("+")) return cleaned;
  return `+${cleaned}`;
}
