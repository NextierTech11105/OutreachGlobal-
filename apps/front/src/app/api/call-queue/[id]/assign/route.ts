/**
 * PUT /api/call-queue/[id]/assign
 *
 * Assigns a call queue item to a user/persona and marks it in_progress.
 * Updates both call_queue and lead_state.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redis, isRedisAvailable } from "@/lib/redis";

interface AssignBody {
  teamId?: string;
  assignedTo?: string;
  persona?: "gianna" | "cathy" | "sabrina";
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: AssignBody = await request.json();
    const teamId = request.headers.get("x-team-id") || body.teamId;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "teamId required (x-team-id header or body)" },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Call queue item ID required" },
        { status: 400 }
      );
    }

    // Update Redis call queue
    const queueKey = `call:queue:${teamId}`;
    let queueItem: any = null;

    if (isRedisAvailable()) {
      const queueData = await redis.get<string>(queueKey);
      if (queueData) {
        const items = typeof queueData === "string" ? JSON.parse(queueData) : queueData;
        const itemIndex = items.findIndex((item: any) => item.id === id);

        if (itemIndex >= 0) {
          queueItem = items[itemIndex];
          queueItem.status = "in_progress";
          queueItem.lastAttempt = new Date().toISOString();
          queueItem.attempts = (queueItem.attempts || 0) + 1;
          if (body.assignedTo) queueItem.assignedTo = body.assignedTo;
          if (body.persona) queueItem.persona = body.persona;

          items[itemIndex] = queueItem;
          await redis.set(queueKey, JSON.stringify(items));
        }
      }
    }

    if (!queueItem) {
      return NextResponse.json(
        { success: false, error: "Call queue item not found" },
        { status: 404 }
      );
    }

    // Update lead status in database if leadId exists
    if (queueItem.leadId) {
      try {
        await db
          .update(leads)
          .set({
            status: "in_call",
            pipelineStatus: "queued",
            updatedAt: new Date(),
          })
          .where(and(eq(leads.id, queueItem.leadId), eq(leads.teamId, teamId)));
      } catch (dbError) {
        console.error("[CallQueue] Failed to update lead status:", dbError);
        // Continue - Redis update succeeded
      }
    }

    return NextResponse.json({
      success: true,
      item: queueItem,
      message: `Call ${id} assigned and marked in_progress`,
    });
  } catch (error) {
    console.error("[CallQueue] Assign error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign call" },
      { status: 500 }
    );
  }
}
