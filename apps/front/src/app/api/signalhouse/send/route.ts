import { NextRequest, NextResponse } from "next/server";

const SIGNALHOUSE_API_BASE = "https://api.signalhouse.io/api/v1";
const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const SIGNALHOUSE_AUTH_TOKEN = process.env.SIGNALHOUSE_AUTH_TOKEN || "";

// Build auth headers per SignalHouse docs
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (SIGNALHOUSE_API_KEY) headers["apiKey"] = SIGNALHOUSE_API_KEY;
  if (SIGNALHOUSE_AUTH_TOKEN) headers["authToken"] = SIGNALHOUSE_AUTH_TOKEN;
  return headers;
}

export async function POST(request: NextRequest) {
  try {
    const { to, from, message, mediaUrl, phoneType, skipLandlineValidation } =
      await request.json();

    if (!SIGNALHOUSE_API_KEY && !SIGNALHOUSE_AUTH_TOKEN) {
      return NextResponse.json(
        {
          error:
            "SignalHouse credentials not configured (need apiKey or authToken)",
        },
        { status: 400 },
      );
    }

    if (!to || !from || !message) {
      return NextResponse.json(
        { error: "to, from, and message are required" },
        { status: 400 },
      );
    }

    // Block landlines - they cannot receive SMS
    const normalizedType = (phoneType || "").toLowerCase();
    if (normalizedType === "landline" && !skipLandlineValidation) {
      return NextResponse.json(
        {
          error: "Cannot send SMS to landline numbers",
          phoneType: "landline",
          suggestion: "Use voice calls for landline numbers",
        },
        { status: 400 },
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
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || "Failed to send message" },
        { status: response.status },
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
    const message =
      error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
