/**
 * Campaign Attempt Log API (Lightweight)
 *
 * SignalHouse ABSORBS all message logs - we query their API for reports.
 * We only store MINIMAL data for business logic:
 *
 * SignalHouse handles (query via their API):
 * - All message content (inbound/outbound)
 * - Delivery status tracking
 * - Opt-out management
 * - Analytics & Reports
 *
 * We track locally (lightweight):
 * - Campaign ID ↔ context mapping (initial, retarget, follow_up, etc.)
 * - Auto-retarget scheduling (our business rules)
 * - Human-in-the-loop approvals
 * - Lead ↔ Campaign associations for our internal routing
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { campaignAttempts } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { signalHouseService } from "@/lib/services/signalhouse-service";

// Campaign context types
type CampaignContext =
  | "initial"
  | "retarget"
  | "follow_up"
  | "book_appointment"
  | "confirm_appointment"
  | "nurture"
  | "ghost"
  | "scheduled"
  | "instant";

interface AttemptLogRequest {
  leadId: string;
  campaignContext: CampaignContext;
  attemptNumber: number;
  channel: "sms" | "dialer" | "email";
  templateUsed?: string;
  templateCategory?: string;
  status: "queued" | "sent" | "delivered" | "failed";
  contactMade: boolean;
  response?: string;
  // SignalHouse linkage
  providerMessageId?: string;
  // Campaign linkage
  campaignId?: string;
  campaignName?: string;
  // Agent
  agent?: "gianna" | "sabrina";
  // Auto-retarget
  autoRetargetEligible?: boolean;
  humanApprovalRequired?: boolean;
  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * POST - Log a campaign attempt
 * Called by the orchestrator after each outreach attempt
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: AttemptLogRequest = await request.json();

    // Validate required fields
    if (!body.leadId || !body.campaignContext || !body.channel) {
      return NextResponse.json(
        { error: "leadId, campaignContext, and channel are required" },
        { status: 400 }
      );
    }

    // Get previous attempt count for this lead
    const previousAttempts = await db
      .select()
      .from(campaignAttempts)
      .where(eq(campaignAttempts.leadId, body.leadId))
      .orderBy(desc(campaignAttempts.createdAt));

    const attemptCount = previousAttempts.length;

    // Create the attempt log
    const [attempt] = await db
      .insert(campaignAttempts)
      .values({
        leadId: body.leadId,
        teamId: teamId || undefined,
        userId,
        campaignContext: body.campaignContext,
        campaignId: body.campaignId,
        campaignName: body.campaignName,
        attemptNumber: body.attemptNumber || attemptCount + 1,
        previousAttempts: attemptCount,
        channel: body.channel,
        templateUsed: body.templateUsed,
        templateCategory: body.templateCategory,
        agent: body.agent,
        status: body.status,
        contactMade: body.contactMade,
        responseText: body.response,
        providerMessageId: body.providerMessageId,
        autoRetargetEligible: body.autoRetargetEligible ?? false,
        humanApprovalRequired: body.humanApprovalRequired ?? false,
        metadata: body.metadata,
        sentAt: body.status === "sent" || body.status === "delivered" ? new Date() : undefined,
        deliveredAt: body.status === "delivered" ? new Date() : undefined,
      })
      .returning();

    console.log(`[Attempt Log] ${body.campaignContext} #${body.attemptNumber || attemptCount + 1} for lead ${body.leadId}: ${body.status}`);

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      leadId: body.leadId,
      attemptNumber: attempt.attemptNumber,
      totalAttempts: attemptCount + 1,
      status: body.status,
      // Audit trail
      audit: {
        ourAttemptId: attempt.id,
        signalHouseMessageId: body.providerMessageId,
        campaignId: body.campaignId,
        timestamp: attempt.createdAt,
      },
    });
  } catch (error) {
    console.error("[Attempt Log] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log attempt" },
      { status: 500 }
    );
  }
}

/**
 * GET - Retrieve attempt history for a lead or campaign
 *
 * Query params:
 * - leadId: Get all attempts for a specific lead
 * - campaignId: Get all attempts for a campaign
 * - campaignContext: Filter by context (initial, retarget, etc.)
 * - limit: Max results (default 50)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const campaignId = searchParams.get("campaignId");
    const campaignContext = searchParams.get("campaignContext");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build query conditions
    const conditions = [];
    if (teamId) {
      conditions.push(eq(campaignAttempts.teamId, teamId));
    }
    if (leadId) {
      conditions.push(eq(campaignAttempts.leadId, leadId));
    }
    if (campaignId) {
      conditions.push(eq(campaignAttempts.campaignId, campaignId));
    }
    if (campaignContext) {
      conditions.push(eq(campaignAttempts.campaignContext, campaignContext));
    }

    const attempts = await db
      .select()
      .from(campaignAttempts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(campaignAttempts.createdAt))
      .limit(limit);

    // Calculate stats
    const stats = {
      total: attempts.length,
      byContext: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byChannel: {} as Record<string, number>,
      contactMadeCount: 0,
      responseReceivedCount: 0,
    };

    for (const attempt of attempts) {
      // By context
      stats.byContext[attempt.campaignContext] = (stats.byContext[attempt.campaignContext] || 0) + 1;
      // By status
      stats.byStatus[attempt.status] = (stats.byStatus[attempt.status] || 0) + 1;
      // By channel
      stats.byChannel[attempt.channel] = (stats.byChannel[attempt.channel] || 0) + 1;
      // Contact made
      if (attempt.contactMade) stats.contactMadeCount++;
      // Response received
      if (attempt.responseReceived) stats.responseReceivedCount++;
    }

    return NextResponse.json({
      success: true,
      attempts,
      stats,
      // Audit info
      audit: {
        query: { leadId, campaignId, campaignContext, limit },
        resultCount: attempts.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Attempt Log] GET Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch attempts" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update an attempt (e.g., when response received, status change)
 *
 * Body:
 * - attemptId: ID of the attempt to update
 * - status: New status
 * - contactMade: Whether contact was made
 * - responseText: Response text
 * - responseClassification: Classification of response
 * - providerStatus: SignalHouse status update
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { attemptId, ...updates } = body;

    if (!attemptId) {
      return NextResponse.json(
        { error: "attemptId is required" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.status) updateData.status = updates.status;
    if (updates.contactMade !== undefined) updateData.contactMade = updates.contactMade;
    if (updates.responseText) {
      updateData.responseText = updates.responseText;
      updateData.responseReceived = true;
      updateData.responseReceivedAt = new Date();
    }
    if (updates.responseClassification) updateData.responseClassification = updates.responseClassification;
    if (updates.providerStatus) updateData.providerStatus = updates.providerStatus;
    if (updates.providerMessageId) updateData.providerMessageId = updates.providerMessageId;
    if (updates.deliveredAt) updateData.deliveredAt = new Date(updates.deliveredAt);
    if (updates.humanApprovedBy) {
      updateData.humanApprovedBy = updates.humanApprovedBy;
      updateData.humanApprovedAt = new Date();
    }

    const [updated] = await db
      .update(campaignAttempts)
      .set(updateData)
      .where(eq(campaignAttempts.id, attemptId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Attempt not found" },
        { status: 404 }
      );
    }

    console.log(`[Attempt Log] Updated attempt ${attemptId}: ${JSON.stringify(updates)}`);

    return NextResponse.json({
      success: true,
      attempt: updated,
      audit: {
        attemptId,
        updatedFields: Object.keys(updates),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Attempt Log] PATCH Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update attempt" },
      { status: 500 }
    );
  }
}
