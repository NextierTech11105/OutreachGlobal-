/**
 * Call Center Queue API
 * Manages the call queue for power dialer
 */

import { NextRequest, NextResponse } from "next/server";

// In-memory call queue (would be Redis/DB in production)
interface CallQueueItem {
  id: string;
  leadId: string;
  leadName?: string;
  phone: string;
  address?: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "no_answer";
  priority: number;
  scheduledAt?: Date;
  attempts: number;
  lastAttempt?: Date;
  notes?: string;
  outcome?: string;
  duration?: number;
  createdAt: Date;
}

// Simulated in-memory queue (in production, use Redis or DB)
const callQueue: Map<string, CallQueueItem> = new Map();

// GET - Get queue stats and items
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "stats";

  try {
    const items = Array.from(callQueue.values());

    switch (action) {
      case "stats": {
        const stats = {
          total: items.length,
          pending: items.filter((i) => i.status === "pending").length,
          inProgress: items.filter((i) => i.status === "in_progress").length,
          completed: items.filter((i) => i.status === "completed").length,
          failed: items.filter((i) => i.status === "failed").length,
          noAnswer: items.filter((i) => i.status === "no_answer").length,
        };
        return NextResponse.json({ success: true, stats });
      }

      case "next": {
        // Get next call to make (pending, sorted by priority and schedule)
        const now = new Date();
        const pendingCalls = items
          .filter(
            (i) =>
              i.status === "pending" &&
              (!i.scheduledAt || new Date(i.scheduledAt) <= now),
          )
          .sort((a, b) => b.priority - a.priority);

        if (pendingCalls.length === 0) {
          return NextResponse.json({ success: true, nextCall: null });
        }

        return NextResponse.json({
          success: true,
          nextCall: pendingCalls[0],
          remaining: pendingCalls.length - 1,
        });
      }

      case "list": {
        const status = searchParams.get("status");
        const limit = parseInt(searchParams.get("limit") || "50");

        let filtered = items;
        if (status) {
          filtered = items.filter((i) => i.status === status);
        }

        // Sort by priority (highest first) then by createdAt
        filtered.sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

        return NextResponse.json({
          success: true,
          items: filtered.slice(0, limit),
          total: filtered.length,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[Call Queue] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get queue info" },
      { status: 500 },
    );
  }
}

// POST - Add calls to queue or update status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "add_single": {
        const {
          leadId,
          leadName,
          phone,
          address,
          priority = 5,
          scheduledAt,
        } = body;

        if (!leadId || !phone) {
          return NextResponse.json(
            { success: false, error: "leadId and phone required" },
            { status: 400 },
          );
        }

        const id = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const item: CallQueueItem = {
          id,
          leadId,
          leadName,
          phone,
          address,
          status: "pending",
          priority,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          attempts: 0,
          createdAt: new Date(),
        };

        callQueue.set(id, item);

        return NextResponse.json({
          success: true,
          callId: id,
        });
      }

      case "add_batch": {
        const { leads, priority = 5, scheduledAt } = body;

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
          return NextResponse.json(
            { success: false, error: "leads array required" },
            { status: 400 },
          );
        }

        const results = {
          added: 0,
          skipped: 0,
          callIds: [] as string[],
        };

        for (const lead of leads) {
          if (!lead.phone) {
            results.skipped++;
            continue;
          }

          const id = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const item: CallQueueItem = {
            id,
            leadId: lead.id,
            leadName: lead.name,
            phone: lead.phone,
            address: lead.address,
            status: "pending",
            priority,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
            attempts: 0,
            createdAt: new Date(),
          };

          callQueue.set(id, item);
          results.added++;
          results.callIds.push(id);
        }

        return NextResponse.json({
          success: true,
          ...results,
        });
      }

      case "start_call": {
        const { callId } = body;

        if (!callId) {
          return NextResponse.json(
            { success: false, error: "callId required" },
            { status: 400 },
          );
        }

        const item = callQueue.get(callId);
        if (!item) {
          return NextResponse.json(
            { success: false, error: "Call not found" },
            { status: 404 },
          );
        }

        item.status = "in_progress";
        item.attempts++;
        item.lastAttempt = new Date();
        callQueue.set(callId, item);

        return NextResponse.json({
          success: true,
          call: item,
        });
      }

      case "complete_call": {
        const { callId, outcome, notes, duration } = body;

        if (!callId) {
          return NextResponse.json(
            { success: false, error: "callId required" },
            { status: 400 },
          );
        }

        const item = callQueue.get(callId);
        if (!item) {
          return NextResponse.json(
            { success: false, error: "Call not found" },
            { status: 404 },
          );
        }

        item.status = outcome === "no_answer" ? "no_answer" : "completed";
        item.outcome = outcome;
        item.notes = notes;
        item.duration = duration;
        callQueue.set(callId, item);

        return NextResponse.json({
          success: true,
          call: item,
        });
      }

      case "reschedule": {
        const { callId, scheduledAt } = body;

        if (!callId || !scheduledAt) {
          return NextResponse.json(
            { success: false, error: "callId and scheduledAt required" },
            { status: 400 },
          );
        }

        const item = callQueue.get(callId);
        if (!item) {
          return NextResponse.json(
            { success: false, error: "Call not found" },
            { status: 404 },
          );
        }

        item.status = "pending";
        item.scheduledAt = new Date(scheduledAt);
        callQueue.set(callId, item);

        return NextResponse.json({
          success: true,
          call: item,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[Call Queue] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 },
    );
  }
}

// DELETE - Remove calls from queue
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, callId, leadId } = body;

    switch (action) {
      case "remove": {
        if (!callId) {
          return NextResponse.json(
            { success: false, error: "callId required" },
            { status: 400 },
          );
        }

        const deleted = callQueue.delete(callId);
        return NextResponse.json({
          success: deleted,
          message: deleted ? "Call removed" : "Call not found",
        });
      }

      case "remove_lead": {
        if (!leadId) {
          return NextResponse.json(
            { success: false, error: "leadId required" },
            { status: 400 },
          );
        }

        let removed = 0;
        for (const [id, item] of callQueue) {
          if (item.leadId === leadId && item.status === "pending") {
            callQueue.delete(id);
            removed++;
          }
        }

        return NextResponse.json({
          success: true,
          removed,
        });
      }

      case "clear_completed": {
        let removed = 0;
        for (const [id, item] of callQueue) {
          if (item.status === "completed") {
            callQueue.delete(id);
            removed++;
          }
        }

        return NextResponse.json({
          success: true,
          removed,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[Call Queue] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 },
    );
  }
}
