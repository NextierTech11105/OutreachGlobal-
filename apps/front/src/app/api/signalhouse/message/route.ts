import { NextRequest, NextResponse } from "next/server";
import {
  sendSMS,
  sendMMS,
  getMessageLogs,
  getConversation,
  calculateSegments,
  isConfigured,
} from "@/lib/signalhouse/client";

// GET - Get message logs or conversations
export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "SignalHouse not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "logs";
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
  const message = searchParams.get("message");

  try {
    // Calculate message segments
    if (action === "segments" && message) {
      const result = await calculateSegments(message);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      return NextResponse.json({
        success: true,
        message,
        segments: result.data?.segments,
        encoding: result.data?.encoding,
      });
    }

    // Get conversation between two numbers
    if (action === "conversation" && from && to) {
      const result = await getConversation(from, to);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      return NextResponse.json({
        success: true,
        from,
        to,
        messages: result.data || [],
      });
    }

    // Get message logs (default)
    const result = await getMessageLogs({ from, to, limit });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({
      success: true,
      logs: result.data || [],
      count: (result.data || []).length,
    });
  } catch (error) {
    console.error("[SignalHouse Message] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get messages" },
      { status: 500 }
    );
  }
}

// POST - Send SMS or MMS
export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "SignalHouse not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { to, from, message, mediaUrl, action } = body;

    // Calculate segments without sending
    if (action === "segments") {
      if (!message) {
        return NextResponse.json({ error: "message required" }, { status: 400 });
      }
      const result = await calculateSegments(message);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      return NextResponse.json({
        success: true,
        message,
        segments: result.data?.segments,
        encoding: result.data?.encoding,
      });
    }

    // Validate required fields for sending
    if (!to || !from || !message) {
      return NextResponse.json(
        { error: "to, from, and message are required" },
        { status: 400 }
      );
    }

    // Send MMS if mediaUrl provided
    if (mediaUrl) {
      const result = await sendMMS({ to, from, message, mediaUrl });
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      return NextResponse.json({
        success: true,
        type: "mms",
        messageId: result.data?.messageId,
        status: result.data?.status,
        to,
        from,
      });
    }

    // Send SMS
    const result = await sendSMS({ to, from, message });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({
      success: true,
      type: "sms",
      messageId: result.data?.messageId,
      status: result.data?.status,
      segments: result.data?.segments,
      to,
      from,
    });
  } catch (error) {
    console.error("[SignalHouse Message] Send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send message" },
      { status: 500 }
    );
  }
}
