import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { smsMessages, callLogs, leads } from "@/lib/db/schema";
import { desc, eq, and, or, gte, sql } from "drizzle-orm";
import { apiAuth } from "@/lib/api-auth";

// SignalHouse API for message logs
// Uses /api/v1 base with x-api-key auth (like stats endpoint)
const SIGNALHOUSE_API_V1 = "https://api.signalhouse.io/api/v1";
// Uses bare base with apiKey/authToken headers (like bulk-send endpoint)
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

// For v1 API endpoints (analytics, message logs)
function getV1Headers(): Record<string, string> {
  return {
    "x-api-key": SIGNALHOUSE_API_KEY,
    "Content-Type": "application/json",
  };
}

// For message sending endpoints
function getSendHeaders(): Record<string, string> {
  return {
    accept: "application/json",
    apiKey: SIGNALHOUSE_API_KEY,
    authToken: SIGNALHOUSE_AUTH_TOKEN,
    "Content-Type": "application/json",
  };
}

// GET - Fetch message logs from database and SignalHouse
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // sms, voice, all
    const status = searchParams.get("status");
    const direction = searchParams.get("direction"); // inbound, outbound
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Try to get auth context for team filtering
    let teamId: string | null = null;
    try {
      const auth = await apiAuth(request);
      if (auth) {
        teamId = auth.teamId;
      }
    } catch {
      // Continue without team filter
    }

    const allMessages: Array<{
      id: string;
      type: "sms" | "voice" | "email";
      from: string;
      phone?: string;
      email?: string;
      subject?: string;
      preview: string;
      content: string;
      date: string;
      status: string;
      direction: string;
      campaign?: string;
      leadId?: string;
      metadata?: Record<string, unknown>;
    }> = [];

    // ========================================
    // 1. FETCH FROM DATABASE (sms_messages)
    // ========================================
    try {
      const conditions = [];
      
      // Filter by direction
      if (direction) {
        conditions.push(eq(smsMessages.direction, direction));
      }
      
      // Only get messages from last 30 days for performance
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      conditions.push(gte(smsMessages.createdAt, thirtyDaysAgo));

      const dbMessages = await db
        .select({
          id: smsMessages.id,
          direction: smsMessages.direction,
          fromNumber: smsMessages.fromNumber,
          toNumber: smsMessages.toNumber,
          body: smsMessages.body,
          status: smsMessages.status,
          campaignId: smsMessages.campaignId,
          leadId: smsMessages.leadId,
          provider: smsMessages.provider,
          sentAt: smsMessages.sentAt,
          receivedAt: smsMessages.receivedAt,
          createdAt: smsMessages.createdAt,
          sentByAdvisor: smsMessages.sentByAdvisor,
        })
        .from(smsMessages)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(smsMessages.createdAt))
        .limit(limit)
        .offset(offset);

      for (const msg of dbMessages) {
        const isInbound = msg.direction === "inbound";
        const messageBody = msg.body || "";
        const dateStr = (msg.receivedAt || msg.sentAt || msg.createdAt)?.toISOString() || new Date().toISOString();

        allMessages.push({
          id: msg.id,
          type: "sms",
          from: isInbound ? (msg.fromNumber || "Unknown") : (msg.toNumber || "Unknown"),
          phone: isInbound ? msg.fromNumber || undefined : msg.toNumber || undefined,
          preview: messageBody.substring(0, 100) + (messageBody.length > 100 ? "..." : ""),
          content: messageBody,
          date: dateStr,
          status: mapDbStatus(msg.status, isInbound),
          direction: msg.direction || "outbound",
          campaign: msg.campaignId || undefined,
          leadId: msg.leadId || undefined,
          metadata: {
            provider: msg.provider,
            sentByAdvisor: msg.sentByAdvisor,
          },
        });
      }
    } catch (dbError) {
      console.error("[Inbox API] Database query failed:", dbError);
      // Continue to try SignalHouse
    }

    // ========================================
    // 2. FETCH FROM DATABASE (call_logs)
    // ========================================
    if (type === "all" || type === "voice") {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const dbCalls = await db
          .select({
            id: callLogs.id,
            direction: callLogs.direction,
            fromNumber: callLogs.fromNumber,
            toNumber: callLogs.toNumber,
            status: callLogs.status,
            duration: callLogs.duration,
            recordingUrl: callLogs.recordingUrl,
            transcription: callLogs.transcription,
            leadId: callLogs.leadId,
            startedAt: callLogs.startedAt,
            createdAt: callLogs.createdAt,
          })
          .from(callLogs)
          .where(gte(callLogs.createdAt, thirtyDaysAgo))
          .orderBy(desc(callLogs.createdAt))
          .limit(limit);

        for (const call of dbCalls) {
          const isInbound = call.direction === "inbound";
          const dateStr = (call.startedAt || call.createdAt)?.toISOString() || new Date().toISOString();

          allMessages.push({
            id: call.id,
            type: "voice",
            from: isInbound ? (call.fromNumber || "Unknown") : (call.toNumber || "Unknown"),
            phone: isInbound ? call.fromNumber || undefined : call.toNumber || undefined,
            preview: call.transcription?.substring(0, 100) || `Call - ${call.duration || 0}s`,
            content: call.transcription || `Voice call - Duration: ${call.duration || 0} seconds`,
            date: dateStr,
            status: call.status === "completed" ? "replied" : "new",
            direction: call.direction || "outbound",
            leadId: call.leadId || undefined,
            metadata: {
              duration: call.duration,
              recordingUrl: call.recordingUrl,
            },
          });
        }
      } catch (callError) {
        console.error("[Inbox API] Call logs query failed:", callError);
      }
    }

    // ========================================
    // 3. FALLBACK TO SIGNALHOUSE API
    // ========================================
    if (allMessages.length === 0 && SIGNALHOUSE_API_KEY) {
      try {
        const queryParams = new URLSearchParams();
        queryParams.set("page", page.toString());
        queryParams.set("limit", limit.toString());
        if (direction) queryParams.set("direction", direction);
        if (status) queryParams.set("status", status);

        const response = await fetch(
          `${SIGNALHOUSE_API_V1}/message/logs?${queryParams.toString()}`,
          {
            method: "GET",
            headers: getV1Headers(),
          },
        );

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            const data = await response.json();
            const rawMessages: SignalHouseMessage[] = data.messages || data.data || data || [];
            
            for (const msg of rawMessages) {
              const messageId = msg.id || msg.message_id || msg.sid || `msg-${Date.now()}-${Math.random()}`;
              const isInbound = msg.direction === "inbound" || msg.direction === "incoming";
              const messageBody = msg.body || msg.message || "";
              const dateStr = msg.date_created || msg.date_sent || msg.created_at || new Date().toISOString();

              allMessages.push({
                id: messageId,
                type: "sms",
                from: isInbound ? msg.from || "Unknown" : msg.to || "Unknown",
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
              });
            }
          }
        }
      } catch (fetchError) {
        console.log("[Inbox API] SignalHouse API not available");
      }
    }

    // Sort all messages by date (newest first)
    allMessages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filter by type if specified
    const filteredMessages = type === "all"
      ? allMessages
      : allMessages.filter((m) => m.type === type);

    return NextResponse.json({
      success: true,
      messages: filteredMessages.slice(0, limit),
      total: filteredMessages.length,
      page,
      limit,
      configured: true,
      sources: {
        database: allMessages.length > 0,
        signalhouse: SIGNALHOUSE_API_KEY ? true : false,
      },
    });
  } catch (error: unknown) {
    console.error("[Inbox API] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch messages";
    return NextResponse.json(
      {
        error: message,
        messages: [],
      },
      { status: 200 },
    );
  }
}

function mapDbStatus(dbStatus: string | null, isInbound: boolean): string {
  if (!dbStatus) return isInbound ? "new" : "sent";
  
  switch (dbStatus.toLowerCase()) {
    case "delivered":
      return "replied";
    case "sent":
      return "sent";
    case "received":
    case "pending":
      return "new";
    case "failed":
    case "undelivered":
      return "flagged";
    default:
      return isInbound ? "new" : "sent";
  }
}

// POST - Send a reply via SignalHouse
export async function POST(request: NextRequest) {
  try {
    if (!SIGNALHOUSE_API_KEY) {
      return NextResponse.json(
        {
          error: "SignalHouse not configured",
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { to, message, from, mediaUrl, scheduleAt } = body;

    if (!to || !message) {
      return NextResponse.json(
        {
          error: "to and message are required",
        },
        { status: 400 },
      );
    }

    const fromNumber = from || process.env.SIGNALHOUSE_DEFAULT_NUMBER;
    if (!fromNumber) {
      return NextResponse.json(
        {
          error: "No from number configured",
        },
        { status: 400 },
      );
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
      headers: getSendHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.message || data.error || "Failed to send message",
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      messageId: data.messageId || data.message_id || data.sid,
      scheduled: !!scheduleAt,
    });
  } catch (error: unknown) {
    console.error("[Inbox API] Send error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function mapStatus(
  signalHouseStatus: string | undefined,
  isInbound: boolean,
): string {
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
