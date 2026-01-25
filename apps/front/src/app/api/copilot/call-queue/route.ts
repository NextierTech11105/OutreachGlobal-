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
 * Uses callQueue table for persistence.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, callQueue } from "@/lib/db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";

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
      teamId = "default",
    } = body;

    if (!phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    // Check if already in queue with pending status
    const existing = await db
      .select()
      .from(callQueue)
      .where(
        and(
          eq(callQueue.phone, phone),
          eq(callQueue.status, "pending"),
          eq(callQueue.teamId, teamId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Lead already in queue",
        item: existing[0],
      });
    }

    // Create queue item
    const id = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();

    await db.insert(callQueue).values({
      id,
      teamId,
      leadId: leadId || null,
      phone,
      firstName: firstName || "Unknown",
      lastName,
      company,
      classification: classification || "POSITIVE",
      priority: priority as "HOT" | "WARM" | "COLD",
      reason: reason || "HOT lead routed by AI Copilot",
      status: "pending",
      lastMessage,
      addedAt: now,
    });

    // Get the inserted item
    const [item] = await db
      .select()
      .from(callQueue)
      .where(eq(callQueue.id, id))
      .limit(1);

    // Update lead status in DB if leadId provided
    if (leadId) {
      await db
        .update(leads)
        .set({
          status: "hot_call_queue",
          customFields: sql`
            jsonb_set(
              jsonb_set(
                COALESCE(custom_fields, '{}'::jsonb),
                '{callQueueId}',
                ${JSON.stringify(id)}::jsonb
              ),
              '{priority}',
              ${JSON.stringify(priority)}::jsonb
            )
          `,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));
    }

    // Count pending items for queue position
    const pendingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(callQueue)
      .where(
        and(eq(callQueue.status, "pending"), eq(callQueue.teamId, teamId))
      );

    return NextResponse.json({
      success: true,
      item,
      queuePosition: pendingCount[0]?.count || 1,
    });
  } catch (error) {
    console.error("[Call Queue] POST Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to add to queue",
      },
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
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedTo = searchParams.get("assignedTo");
    const teamId = searchParams.get("teamId") || "default";

    // Build query conditions
    const conditions = [eq(callQueue.teamId, teamId)];
    if (status) conditions.push(eq(callQueue.status, status));
    if (priority) conditions.push(eq(callQueue.priority, priority));
    if (assignedTo) conditions.push(eq(callQueue.assignedTo, assignedTo));

    // Query with sorting by priority (HOT first), then by addedAt
    const items = await db
      .select()
      .from(callQueue)
      .where(and(...conditions))
      .orderBy(
        sql`CASE priority WHEN 'HOT' THEN 0 WHEN 'WARM' THEN 1 WHEN 'COLD' THEN 2 ELSE 3 END`,
        asc(callQueue.addedAt)
      );

    // Calculate stats
    const allItems = await db
      .select()
      .from(callQueue)
      .where(eq(callQueue.teamId, teamId));

    const stats = {
      total: allItems.length,
      pending: allItems.filter((i) => i.status === "pending").length,
      completed: allItems.filter((i) => i.status === "completed").length,
      noAnswer: allItems.filter((i) => i.status === "no_answer").length,
      callback: allItems.filter((i) => i.status === "callback").length,
      byPriority: {
        HOT: allItems.filter(
          (i) => i.priority === "HOT" && i.status === "pending"
        ).length,
        WARM: allItems.filter(
          (i) => i.priority === "WARM" && i.status === "pending"
        ).length,
        COLD: allItems.filter(
          (i) => i.priority === "COLD" && i.status === "pending"
        ).length,
      },
    };

    return NextResponse.json({
      success: true,
      queue: items,
      count: items.length,
      stats,
      worker: "SABRINA",
      nextCall: items.find((i) => i.status === "pending") || null,
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
    const { id, status, assignedTo, callbackAt, notes, outcome } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(callQueue)
      .where(eq(callQueue.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Call queue item not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (assignedTo) updates.assignedTo = assignedTo;
    if (callbackAt) updates.callbackAt = new Date(callbackAt);
    if (notes) updates.notes = notes;
    if (outcome) updates.outcome = outcome;
    if (status === "completed") updates.completedAt = new Date();

    await db.update(callQueue).set(updates).where(eq(callQueue.id, id));

    // Update lead in DB based on outcome
    if (existing.leadId && outcome) {
      let newStage = "hot_call_queue";
      if (outcome === "booked") newStage = "discovery";
      else if (outcome === "not_interested") newStage = "nurture";
      else if (outcome === "callback") newStage = "hot_call_queue";

      await db
        .update(leads)
        .set({
          status: newStage,
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
        .where(eq(leads.id, existing.leadId));
    }

    // Get updated item
    const [item] = await db
      .select()
      .from(callQueue)
      .where(eq(callQueue.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      item,
    });
  } catch (error) {
    console.error("[Call Queue] PATCH Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update call",
      },
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
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(callQueue)
      .where(eq(callQueue.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Call queue item not found" },
        { status: 404 }
      );
    }

    await db.delete(callQueue).where(eq(callQueue.id, id));

    return NextResponse.json({
      success: true,
      removed: existing,
    });
  } catch (error) {
    console.error("[Call Queue] DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to remove from queue" },
      { status: 500 }
    );
  }
}
