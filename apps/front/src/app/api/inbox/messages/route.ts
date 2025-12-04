import { NextRequest, NextResponse } from "next/server";

// SignalHouse API for message logs
const SIGNALHOUSE_API_BASE = "https://api.signalhouse.io";
const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const SIGNALHOUSE_AUTH_TOKEN = process.env.SIGNALHOUSE_AUTH_TOKEN || "";

interface SignalHouseMessage {
  id?: string;
  message_id?: string;
  sid?: string;
  from?: string;
  to?: string;
  body?: string;
  message?: string;
  status?: string;
  direction?: string;
  date_created?: string;
  date_sent?: string;
  created_at?: string;
  media_url?: string;
  error_code?: string;
  error_message?: string;
}

function getHeaders(): Record<string, string> {
  return {
    "accept": "application/json",
    "apiKey": SIGNALHOUSE_API_KEY,
    "authToken": SIGNALHOUSE_AUTH_TOKEN,
    "Content-Type": "application/json",
  };
}

// GET - Fetch message logs from SignalHouse
export async function GET(request: NextRequest) {
  try {
    if (!SIGNALHOUSE_API_KEY || !SIGNALHOUSE_AUTH_TOKEN) {
      return NextResponse.json({
        error: "SignalHouse not configured",
        configured: false,
        messages: [],
      }, { status: 200 }); // Return empty instead of error to avoid UI breaking
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // sms, voice, all
    const status = searchParams.get("status");
    const direction = searchParams.get("direction"); // inbound, outbound
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Fetch message logs from SignalHouse
    const queryParams = new URLSearchParams();
    queryParams.set("page", page.toString());
    queryParams.set("limit", limit.toString());
    if (direction) queryParams.set("direction", direction);
    if (status) queryParams.set("status", status);

    const response = await fetch(
      `${SIGNALHOUSE_API_BASE}/message/logs?${queryParams.toString()}`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Inbox API] SignalHouse error:", errorText);
      return NextResponse.json({
        error: `SignalHouse API error: ${response.status}`,
        messages: [],
      }, { status: 200 });
    }

    const data = await response.json();
    const rawMessages: SignalHouseMessage[] = data.messages || data.data || data || [];

    // Transform SignalHouse messages to our Message format
    const messages = rawMessages.map((msg: SignalHouseMessage) => {
      const messageId = msg.id || msg.message_id || msg.sid || `msg-${Date.now()}-${Math.random()}`;
      const isInbound = msg.direction === "inbound" || msg.direction === "incoming";
      const messageBody = msg.body || msg.message || "";
      const dateStr = msg.date_created || msg.date_sent || msg.created_at || new Date().toISOString();

      return {
        id: messageId,
        type: "sms" as const, // SignalHouse is SMS/MMS
        from: isInbound ? (msg.from || "Unknown") : (msg.to || "Unknown"),
        phone: isInbound ? msg.from : msg.to,
        preview: messageBody.substring(0, 100) + (messageBody.length > 100 ? "..." : ""),
        content: messageBody,
        date: dateStr,
        status: mapStatus(msg.status, isInbound),
        direction: isInbound ? "inbound" : "outbound",
        metadata: {
          signalhouse_id: messageId,
          original_status: msg.status,
          media_url: msg.media_url,
          error_code: msg.error_code,
          error_message: msg.error_message,
        },
      };
    });

    // Filter by type if specified
    const filteredMessages = type === "all"
      ? messages
      : messages.filter((m: { type: string }) => m.type === type);

    return NextResponse.json({
      success: true,
      messages: filteredMessages,
      total: data.total || filteredMessages.length,
      page,
      limit,
      configured: true,
    });
  } catch (error: unknown) {
    console.error("[Inbox API] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch messages";
    return NextResponse.json({
      error: message,
      messages: [],
    }, { status: 200 });
  }
}

// POST - Send a reply via SignalHouse
export async function POST(request: NextRequest) {
  try {
    if (!SIGNALHOUSE_API_KEY || !SIGNALHOUSE_AUTH_TOKEN) {
      return NextResponse.json({
        error: "SignalHouse not configured",
      }, { status: 503 });
    }

    const body = await request.json();
    const { to, message, from, mediaUrl, scheduleAt } = body;

    if (!to || !message) {
      return NextResponse.json({
        error: "to and message are required",
      }, { status: 400 });
    }

    const fromNumber = from || process.env.SIGNALHOUSE_DEFAULT_NUMBER;
    if (!fromNumber) {
      return NextResponse.json({
        error: "No from number configured",
      }, { status: 400 });
    }

    // Build payload
    const payload: Record<string, unknown> = {
      from: fromNumber,
      to,
      message,
    };

    // Handle scheduling
    if (scheduleAt) {
      payload.scheduledAt = scheduleAt;
    }

    // Handle MMS
    if (mediaUrl) {
      payload.mediaUrl = mediaUrl;
    }

    const endpoint = mediaUrl
      ? `${SIGNALHOUSE_API_BASE}/message/sendMMS`
      : `${SIGNALHOUSE_API_BASE}/message/sendSMS`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        error: data.message || data.error || "Failed to send message",
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      messageId: data.messageId || data.message_id || data.sid,
      scheduled: !!scheduleAt,
    });
  } catch (error: unknown) {
    console.error("[Inbox API] Send error:", error);
    const message = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function mapStatus(signalHouseStatus: string | undefined, isInbound: boolean): string {
  if (!signalHouseStatus) return isInbound ? "new" : "replied";

  const status = signalHouseStatus.toLowerCase();
  switch (status) {
    case "delivered":
    case "sent":
      return "replied";
    case "received":
    case "pending":
      return "new";
    case "failed":
    case "undelivered":
      return "flagged";
    case "queued":
      return "new";
    default:
      return isInbound ? "new" : "replied";
  }
}
