/**
 * PUT /api/call-queue/[id]/complete
 *
 * Completes a call queue item with outcome.
 * Updates both call_queue and lead_state.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redis, isRedisAvailable } from "@/lib/redis";

type CallOutcome =
  | "connected"
  | "voicemail"
  | "no_answer"
  | "busy"
  | "wrong_number"
  | "booked"
  | "declined";

interface CompleteBody {
  teamId?: string;
  outcome: CallOutcome;
  notes?: string;
  duration?: number;
  nextAction?: "follow_up" | "nurture" | "close" | "remove";
  scheduledFollowUp?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body: CompleteBody = await request.json();
    const teamId = request.headers.get("x-team-id") || body.teamId;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "teamId required (x-team-id header or body)" },
        { status: 401 },
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Call queue item ID required" },
        { status: 400 },
      );
    }

    if (!body.outcome) {
      return NextResponse.json(
        { success: false, error: "outcome required" },
        { status: 400 },
      );
    }

    // Update Redis call queue
    const queueKey = `call:queue:${teamId}`;
    let queueItem: any = null;

    if (isRedisAvailable()) {
      const queueData = await redis.get<string>(queueKey);
      if (queueData) {
        const items =
          typeof queueData === "string" ? JSON.parse(queueData) : queueData;
        const itemIndex = items.findIndex((item: any) => item.id === id);

        if (itemIndex >= 0) {
          queueItem = items[itemIndex];

          // Determine final status based on outcome
          const failedOutcomes = ["no_answer", "busy", "wrong_number"];
          queueItem.status = failedOutcomes.includes(body.outcome)
            ? body.outcome === "no_answer"
              ? "no_answer"
              : "failed"
            : "completed";

          queueItem.outcome = body.outcome;
          queueItem.completedAt = new Date().toISOString();
          if (body.notes) queueItem.notes = body.notes;
          if (body.duration) queueItem.duration = body.duration;

          items[itemIndex] = queueItem;
          await redis.set(queueKey, JSON.stringify(items));
        }
      }
    }

    if (!queueItem) {
      return NextResponse.json(
        { success: false, error: "Call queue item not found" },
        { status: 404 },
      );
    }

    // Update lead status in database if leadId exists
    if (queueItem.leadId) {
      try {
        // Map outcome to pipeline status
        const pipelineMap: Record<string, string> = {
          connected: "sent",
          booked: "booked",
          declined: "sent",
          voicemail: "sent",
          no_answer: "queued",
          busy: "queued",
          wrong_number: "raw",
        };

        // Map outcome to lead status
        const statusMap: Record<string, string> = {
          connected: "contacted",
          booked: "qualified",
          declined: "closed",
          voicemail: "contacted",
          no_answer: "pending",
          busy: "pending",
          wrong_number: "invalid",
        };

        await db
          .update(leads)
          .set({
            status: statusMap[body.outcome] || "contacted",
            pipelineStatus: pipelineMap[body.outcome] || "sent",
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
      message: `Call ${id} completed with outcome: ${body.outcome}`,
    });
  } catch (error) {
    console.error("[CallQueue] Complete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete call" },
      { status: 500 },
    );
  }
}
