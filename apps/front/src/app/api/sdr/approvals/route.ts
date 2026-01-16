/**
 * SDR Approvals API - Batch approve/reject agent suggestions
 *
 * Endpoints:
 * - GET: Fetch pending approvals
 * - POST: Batch approve/reject
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sdrActivityLog } from "@/lib/db/schema";
import { eq, and, inArray, desc, isNull } from "drizzle-orm";

// Rejection reasons for dropdown
export const REJECTION_REASONS = [
  "inappropriate_tone",
  "wrong_information",
  "bad_timing",
  "needs_human_touch",
  "compliance_risk",
  "other",
] as const;

type RejectionReason = (typeof REJECTION_REASONS)[number];

interface BatchApprovalRequest {
  action: "approve" | "reject";
  activityIds: string[];
  reason?: RejectionReason;
  customReason?: string;
}

/**
 * GET /api/sdr/approvals
 * Fetch pending approvals for the team
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId, teamId } = await apiAuth();

    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const agent = searchParams.get("agent"); // Filter by agent

    // Build query
    const conditions = [
      eq(sdrActivityLog.teamId, teamId),
      eq(sdrActivityLog.requiresApproval, true),
      eq(sdrActivityLog.status, "pending"),
    ];

    if (agent) {
      conditions.push(eq(sdrActivityLog.agent, agent));
    }

    const pendingApprovals = await db
      .select()
      .from(sdrActivityLog)
      .where(and(...conditions))
      .orderBy(desc(sdrActivityLog.createdAt))
      .limit(limit);

    // Calculate SLA status for each
    const now = new Date();
    const approvalsWithSla = pendingApprovals.map((approval) => ({
      ...approval,
      slaStatus: approval.slaDeadline
        ? now > approval.slaDeadline
          ? "breached"
          : "pending"
        : "none",
      timeRemaining: approval.slaDeadline
        ? Math.max(0, approval.slaDeadline.getTime() - now.getTime())
        : null,
    }));

    // Group by agent for UI
    const byAgent = approvalsWithSla.reduce(
      (acc, approval) => {
        if (!acc[approval.agent]) {
          acc[approval.agent] = [];
        }
        acc[approval.agent].push(approval);
        return acc;
      },
      {} as Record<string, typeof approvalsWithSla>,
    );

    return NextResponse.json({
      success: true,
      total: pendingApprovals.length,
      approvals: approvalsWithSla,
      byAgent,
      slaBreached: approvalsWithSla.filter((a) => a.slaStatus === "breached")
        .length,
    });
  } catch (error) {
    console.error("[SDR Approvals GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch approvals" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/sdr/approvals
 * Batch approve or reject activities
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId, teamId } = await apiAuth();

    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    const body: BatchApprovalRequest = await request.json();
    const { action, activityIds, reason, customReason } = body;

    if (!action || !activityIds?.length) {
      return NextResponse.json(
        { error: "action and activityIds are required" },
        { status: 400 },
      );
    }

    if (action === "reject" && !reason) {
      return NextResponse.json(
        { error: "reason is required for rejection" },
        { status: 400 },
      );
    }

    // Verify all activities belong to this team
    const activities = await db
      .select()
      .from(sdrActivityLog)
      .where(
        and(
          eq(sdrActivityLog.teamId, teamId),
          inArray(sdrActivityLog.id, activityIds),
        ),
      );

    if (activities.length !== activityIds.length) {
      return NextResponse.json(
        { error: "Some activities not found or unauthorized" },
        { status: 400 },
      );
    }

    const now = new Date();
    const results = {
      approved: 0,
      rejected: 0,
      failed: 0,
      sent: 0,
    };

    if (action === "approve") {
      // Update activities to approved status
      await db
        .update(sdrActivityLog)
        .set({
          status: "approved",
          approvedBy: userId,
          approvedAt: now,
          updatedAt: now,
        })
        .where(inArray(sdrActivityLog.id, activityIds));

      results.approved = activityIds.length;

      // Trigger actual sends for each approved activity
      for (const activity of activities) {
        try {
          await executeApprovedAction(activity, request);
          results.sent++;
        } catch (error) {
          console.error(
            `[SDR Approvals] Failed to execute action for ${activity.id}:`,
            error,
          );
          results.failed++;
        }
      }
    } else {
      // Reject
      const rejectionText =
        reason === "other" && customReason ? customReason : reason;

      await db
        .update(sdrActivityLog)
        .set({
          status: "rejected",
          rejectionReason: rejectionText,
          updatedAt: now,
        })
        .where(inArray(sdrActivityLog.id, activityIds));

      results.rejected = activityIds.length;
    }

    return NextResponse.json({
      success: true,
      action,
      results,
    });
  } catch (error) {
    console.error("[SDR Approvals POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Batch action failed" },
      { status: 500 },
    );
  }
}

/**
 * Execute the approved action (send SMS, make call, etc.)
 */
async function executeApprovedAction(
  activity: typeof sdrActivityLog.$inferSelect,
  request: NextRequest,
): Promise<void> {
  const payload = activity.payload as Record<string, unknown> | null;

  if (!payload) {
    console.warn(`[SDR Approvals] No payload for activity ${activity.id}`);
    return;
  }

  switch (activity.agent) {
    case "GIANNA": {
      // Send SMS via existing GIANNA endpoint
      if (payload.suggestion && payload.phone) {
        await fetch(
          `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/gianna/respond`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify({
              leadId: activity.leadId,
              phone: payload.phone,
              message: payload.suggestion,
              approved: true,
            }),
          },
        );
      }
      break;
    }

    case "CATHY": {
      // Send nurture message via CATHY endpoint
      if (payload.suggestion && activity.leadId) {
        await fetch(
          `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/cathy/nudge`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify({
              leadId: activity.leadId,
              message: payload.suggestion,
              approved: true,
            }),
          },
        );
      }
      break;
    }

    case "SABRINA": {
      // Book appointment via SABRINA endpoint
      if (payload.slotId && activity.leadId) {
        await fetch(
          `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/sabrina/auto-book`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify({
              leadId: activity.leadId,
              slotId: payload.slotId,
              approved: true,
            }),
          },
        );
      }
      break;
    }

    default:
      console.log(
        `[SDR Approvals] No execution handler for agent ${activity.agent}`,
      );
  }
}
