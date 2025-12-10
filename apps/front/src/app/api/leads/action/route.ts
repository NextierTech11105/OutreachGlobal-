import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * LEAD ACTIONS API
 *
 * Bulk actions for leads in campaigns:
 * - pause: Temporarily hold lead (skip in queues)
 * - suppress: Permanent DNC (remove from all campaigns)
 * - rethink: Flag for review/strategy change
 * - revisit: Schedule future follow-up
 * - resume: Clear pause/rethink and reactivate
 */

type LeadAction = "pause" | "suppress" | "rethink" | "revisit" | "resume";

interface ActionRequest {
  leadIds: string[];
  action: LeadAction;
  reason?: string;
  revisitDate?: string; // ISO date for revisit
}

// POST - Apply action to leads
export async function POST(request: NextRequest) {
  try {
    const body: ActionRequest = await request.json();
    const { leadIds, action, reason, revisitDate } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: "leadIds array is required" },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: "action is required (pause, suppress, rethink, revisit, resume)" },
        { status: 400 }
      );
    }

    const now = new Date();
    let updateData: Record<string, unknown> = { updatedAt: now };

    switch (action) {
      case "pause":
        updateData = {
          ...updateData,
          pausedAt: now,
          pauseReason: reason || "manual",
        };
        break;

      case "suppress":
        updateData = {
          ...updateData,
          suppressedAt: now,
          suppressReason: reason || "dnc",
          status: "lost", // Move to lost status
        };
        break;

      case "rethink":
        updateData = {
          ...updateData,
          rethinkAt: now,
          rethinkReason: reason || "review",
        };
        break;

      case "revisit":
        if (!revisitDate) {
          return NextResponse.json(
            { error: "revisitDate is required for revisit action" },
            { status: 400 }
          );
        }
        updateData = {
          ...updateData,
          revisitAt: new Date(revisitDate),
          revisitReason: reason || "follow_up",
        };
        break;

      case "resume":
        // Clear all action flags
        updateData = {
          ...updateData,
          pausedAt: null,
          pauseReason: null,
          rethinkAt: null,
          rethinkReason: null,
          // Note: revisit and suppress are NOT cleared by resume
        };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Apply action to all leads
    await db
      .update(leads)
      .set(updateData)
      .where(inArray(leads.id, leadIds));

    console.log(`[LeadAction] ${action} applied to ${leadIds.length} leads`);

    return NextResponse.json({
      success: true,
      action,
      count: leadIds.length,
      reason: reason || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Action failed";
    console.error("[LeadAction] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Get action status for leads
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucketId = searchParams.get("bucketId");
    const filter = searchParams.get("filter"); // 'paused' | 'suppressed' | 'rethink' | 'revisit' | 'active'

    if (!bucketId) {
      return NextResponse.json(
        { error: "bucketId required" },
        { status: 400 }
      );
    }

    // Build query based on filter
    let whereClause;
    if (filter === "paused") {
      whereClause = eq(leads.bucketId, bucketId);
      // Additional filter handled in select
    } else if (filter === "suppressed") {
      whereClause = eq(leads.bucketId, bucketId);
    } else if (filter === "rethink") {
      whereClause = eq(leads.bucketId, bucketId);
    } else if (filter === "revisit") {
      whereClause = eq(leads.bucketId, bucketId);
    } else {
      whereClause = eq(leads.bucketId, bucketId);
    }

    const leadsData = await db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        phone: leads.phone,
        status: leads.status,
        pausedAt: leads.pausedAt,
        pauseReason: leads.pauseReason,
        suppressedAt: leads.suppressedAt,
        suppressReason: leads.suppressReason,
        rethinkAt: leads.rethinkAt,
        rethinkReason: leads.rethinkReason,
        revisitAt: leads.revisitAt,
        revisitReason: leads.revisitReason,
      })
      .from(leads)
      .where(whereClause)
      .limit(500);

    // Apply in-memory filter
    let filtered = leadsData;
    if (filter === "paused") {
      filtered = leadsData.filter(l => l.pausedAt !== null);
    } else if (filter === "suppressed") {
      filtered = leadsData.filter(l => l.suppressedAt !== null);
    } else if (filter === "rethink") {
      filtered = leadsData.filter(l => l.rethinkAt !== null);
    } else if (filter === "revisit") {
      filtered = leadsData.filter(l => l.revisitAt !== null);
    } else if (filter === "active") {
      filtered = leadsData.filter(l =>
        l.pausedAt === null &&
        l.suppressedAt === null &&
        l.rethinkAt === null
      );
    }

    // Get counts
    const counts = {
      paused: leadsData.filter(l => l.pausedAt !== null).length,
      suppressed: leadsData.filter(l => l.suppressedAt !== null).length,
      rethink: leadsData.filter(l => l.rethinkAt !== null).length,
      revisit: leadsData.filter(l => l.revisitAt !== null).length,
      active: leadsData.filter(l =>
        l.pausedAt === null &&
        l.suppressedAt === null &&
        l.rethinkAt === null
      ).length,
    };

    return NextResponse.json({
      success: true,
      leads: filtered,
      counts,
      filter: filter || "all",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Query failed";
    console.error("[LeadAction] Query error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
