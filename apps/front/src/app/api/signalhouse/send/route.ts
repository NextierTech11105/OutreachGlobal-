import { NextRequest, NextResponse } from "next/server";

const SIGNALHOUSE_API_BASE = "https://api.signalhouse.io/api/v1";
const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const { to, from, message, mediaUrl } = await request.json();

    if (!SIGNALHOUSE_API_KEY) {
      return NextResponse.json(
        { error: "SignalHouse API key not configured" },
        { status: 400 }
      );
    }

    if (!to || !from || !message) {
      return NextResponse.json(
        { error: "to, from, and message are required" },
        { status: 400 }
      );
    }

    // Send SMS or MMS based on whether mediaUrl is provided
    const endpoint = mediaUrl
      ? `${SIGNALHOUSE_API_BASE}/message/sendMMS`
      : `${SIGNALHOUSE_API_BASE}/message/sendSMS`;

    const body = mediaUrl
      ? { to, from, message, mediaUrl }
      : { to, from, message };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-api-key": SIGNALHOUSE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || "Failed to send message" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      messageId: data.messageId || data.id,
      data,
    });
  } catch (error: unknown) {
    console.error("SignalHouse send error:", error);
    const message = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
