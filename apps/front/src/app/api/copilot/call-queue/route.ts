/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOT CALL QUEUE API
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/copilot/call-queue - Add lead to call queue
 * GET /api/copilot/call-queue - Get call queue (sorted by priority)
 * PATCH /api/copilot/call-queue - Update call status
 *
 * HOT leads get routed here by the AI Copilot for immediate call follow-up.
 * SABRINA (Closer) owns this queue.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// In-memory queue (in production, use Redis or DB table)
interface CallQueueItem {
  id: string;
  leadId: string;
  phone: string;
  firstName: string;
  lastName?: string;
  company?: string;
  classification: string;
  priority: "HOT" | "WARM" | "COLD";
  reason: string;
  addedAt: Date;
  status: "pending" | "dialing" | "connected" | "completed" | "no_answer" | "callback";
  assignedTo?: string;
  callbackAt?: Date;
  notes?: string;
  lastMessage?: string;
}

// In-memory storage (replace with Redis/DB in production)
const callQueue: CallQueueItem[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Add lead to call queue
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      leadId,
      phone,
      firstName,
      lastName,
      company,
      classification,
      priority = "HOT",
      reason,
      lastMessage,
    } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "phone is required" },
        { status: 400 }
      );
    }

    // Check if already in queue
    const existing = callQueue.find(
      (item) => item.phone === phone && item.status === "pending"
    );

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Lead already in queue",
        item: existing,
      });
    }

    // Create queue item
    const item: CallQueueItem = {
      id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      leadId: leadId || `lead_${Date.now()}`,
      phone,
      firstName: firstName || "Unknown",
      lastName,
      company,
      classification: classification || "POSITIVE",
      priority: priority as CallQueueItem["priority"],
      reason: reason || "HOT lead routed by AI Copilot",
      addedAt: new Date(),
      status: "pending",
      lastMessage,
    };

    callQueue.push(item);

    // Update lead status in DB if leadId provided
    if (leadId) {
      await db
        .update(leads)
        .set({
          stage: "hot_call_queue",
          priority,
          customFields: sql`
            jsonb_set(
              COALESCE(custom_fields, '{}'::jsonb),
              '{callQueueId}',
              ${JSON.stringify(item.id)}::jsonb
            )
          `,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));
    }

    return NextResponse.json({
      success: true,
      item,
      queuePosition: callQueue.filter((i) => i.status === "pending").length,
    });
  } catch (error) {
    console.error("[Call Queue] POST Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add to queue" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get call queue (sorted by priority)
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // pending, completed, etc.
    const priority = searchParams.get("priority"); // HOT, WARM, COLD
    const assignedTo = searchParams.get("assignedTo");

    let filtered = [...callQueue];

    // Apply filters
    if (status) {
      filtered = filtered.filter((item) => item.status === status);
    }
    if (priority) {
      filtered = filtered.filter((item) => item.priority === priority);
    }
    if (assignedTo) {
      filtered = filtered.filter((item) => item.assignedTo === assignedTo);
    }

    // Sort by priority (HOT first), then by time
    const priorityOrder = { HOT: 0, WARM: 1, COLD: 2 };
    filtered.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.addedAt.getTime() - b.addedAt.getTime();
    });

    // Calculate stats
    const stats = {
      total: callQueue.length,
      pending: callQueue.filter((i) => i.status === "pending").length,
      completed: callQueue.filter((i) => i.status === "completed").length,
      noAnswer: callQueue.filter((i) => i.status === "no_answer").length,
      callback: callQueue.filter((i) => i.status === "callback").length,
      byPriority: {
        HOT: callQueue.filter((i) => i.priority === "HOT" && i.status === "pending").length,
        WARM: callQueue.filter((i) => i.priority === "WARM" && i.status === "pending").length,
        COLD: callQueue.filter((i) => i.priority === "COLD" && i.status === "pending").length,
      },
    };

    return NextResponse.json({
      success: true,
      queue: filtered,
      count: filtered.length,
      stats,
      worker: "SABRINA",
      nextCall: filtered.find((i) => i.status === "pending") || null,
    });
  } catch (error) {
    console.error("[Call Queue] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to get call queue" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH - Update call status
// ═══════════════════════════════════════════════════════════════════════════════

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      status,
      assignedTo,
      callbackAt,
      notes,
      outcome,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const index = callQueue.findIndex((item) => item.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: "Call queue item not found" },
        { status: 404 }
      );
    }

    // Update item
    if (status) callQueue[index].status = status;
    if (assignedTo) callQueue[index].assignedTo = assignedTo;
    if (callbackAt) callQueue[index].callbackAt = new Date(callbackAt);
    if (notes) callQueue[index].notes = notes;

    // Update lead in DB based on outcome
    const item = callQueue[index];
    if (item.leadId && outcome) {
      let newStage = "hot_call_queue";
      if (outcome === "booked") newStage = "discovery";
      else if (outcome === "not_interested") newStage = "nurture";
      else if (outcome === "callback") newStage = "hot_call_queue";

      await db
        .update(leads)
        .set({
          stage: newStage,
          customFields: sql`
            jsonb_set(
              jsonb_set(
                COALESCE(custom_fields, '{}'::jsonb),
                '{lastCallOutcome}',
                ${JSON.stringify(outcome)}::jsonb
              ),
              '{lastCallAt}',
              ${JSON.stringify(new Date().toISOString())}::jsonb
            )
          `,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, item.leadId));
    }

    return NextResponse.json({
      success: true,
      item: callQueue[index],
    });
  } catch (error) {
    console.error("[Call Queue] PATCH Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update call" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Remove from queue
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const index = callQueue.findIndex((item) => item.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: "Call queue item not found" },
        { status: 404 }
      );
    }

    const removed = callQueue.splice(index, 1)[0];

    return NextResponse.json({
      success: true,
      removed,
    });
  } catch (error) {
    console.error("[Call Queue] DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to remove from queue" },
      { status: 500 }
    );
  }
}
