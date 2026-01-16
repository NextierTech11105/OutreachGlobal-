/**
 * SDR Activity Stream - Server-Sent Events (SSE)
 *
 * Real-time activity feed for the SDR console.
 * Streams agent actions, approval requests, and status updates.
 *
 * Why SSE over WebSocket:
 * - Works on Vercel/DO serverless
 * - Simpler than WebSocket
 * - Native browser support via EventSource
 */

import { NextRequest } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sdrActivityLog } from "@/lib/db/schema";
import { eq, desc, gt, and } from "drizzle-orm";

// Poll interval in milliseconds
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_CONNECTION_TIME = 30000; // 30 seconds (serverless timeout friendly)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { userId, teamId } = await apiAuth();

    if (!userId || !teamId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get last event ID from header (for reconnection)
    const lastEventId = request.headers.get("Last-Event-ID");
    let lastId: string | null = lastEventId;

    const encoder = new TextEncoder();
    let isClosed = false;
    const startTime = Date.now();

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection event
        const connectEvent = `event: connected\ndata: ${JSON.stringify({ teamId, timestamp: new Date().toISOString() })}\n\n`;
        controller.enqueue(encoder.encode(connectEvent));

        // Poll for new events
        const poll = async () => {
          if (isClosed) return;

          // Check if we've exceeded max connection time
          if (Date.now() - startTime > MAX_CONNECTION_TIME) {
            const reconnectEvent = `event: reconnect\ndata: ${JSON.stringify({ reason: "timeout" })}\n\n`;
            controller.enqueue(encoder.encode(reconnectEvent));
            controller.close();
            return;
          }

          try {
            // Fetch new activities since last ID
            const activities = await fetchNewActivities(teamId, lastId);

            for (const activity of activities) {
              const event = formatSSEEvent(activity);
              controller.enqueue(encoder.encode(event));
              lastId = activity.id;
            }

            // Send heartbeat to keep connection alive
            const heartbeat = `: heartbeat ${Date.now()}\n\n`;
            controller.enqueue(encoder.encode(heartbeat));
          } catch (error) {
            console.error("[SDR Stream] Poll error:", error);
            const errorEvent = `event: error\ndata: ${JSON.stringify({ message: "Poll failed" })}\n\n`;
            controller.enqueue(encoder.encode(errorEvent));
          }

          // Schedule next poll
          if (!isClosed) {
            setTimeout(poll, POLL_INTERVAL);
          }
        };

        // Start polling
        poll();
      },
      cancel() {
        isClosed = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error("[SDR Stream] Error:", error);
    return new Response(JSON.stringify({ error: "Stream failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Fetch new activities from database
 */
async function fetchNewActivities(
  teamId: string,
  lastId: string | null,
): Promise<Array<typeof sdrActivityLog.$inferSelect>> {
  if (!db) {
    return [];
  }

  try {
    if (lastId) {
      // Fetch activities newer than lastId
      // Since we can't easily compare UUIDs chronologically, use createdAt
      const lastActivity = await db
        .select({ createdAt: sdrActivityLog.createdAt })
        .from(sdrActivityLog)
        .where(eq(sdrActivityLog.id, lastId))
        .limit(1);

      if (lastActivity.length > 0) {
        return await db
          .select()
          .from(sdrActivityLog)
          .where(
            and(
              eq(sdrActivityLog.teamId, teamId),
              gt(sdrActivityLog.createdAt, lastActivity[0].createdAt),
            ),
          )
          .orderBy(sdrActivityLog.createdAt)
          .limit(50);
      }
    }

    // Initial fetch - get recent activities
    return await db
      .select()
      .from(sdrActivityLog)
      .where(eq(sdrActivityLog.teamId, teamId))
      .orderBy(desc(sdrActivityLog.createdAt))
      .limit(20);
  } catch (error) {
    console.error("[SDR Stream] Fetch error:", error);
    return [];
  }
}

/**
 * Format activity as SSE event
 */
function formatSSEEvent(
  activity: typeof sdrActivityLog.$inferSelect,
): string {
  const eventType = getEventType(activity.action);
  const data = {
    id: activity.id,
    agent: activity.agent,
    action: activity.action,
    leadId: activity.leadId,
    messageId: activity.messageId,
    conversationId: activity.conversationId,
    status: activity.status,
    requiresApproval: activity.requiresApproval,
    slaDeadline: activity.slaDeadline,
    payload: activity.payload,
    createdAt: activity.createdAt,
  };

  return `id: ${activity.id}\nevent: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Map action to event type
 */
function getEventType(action: string): string {
  const eventMap: Record<string, string> = {
    suggestion: "suggestion",
    approval: "approval",
    rejection: "rejection",
    auto_send: "auto_send",
    enrichment: "enrichment",
    booking: "booking",
  };
  return eventMap[action] || "activity";
}
