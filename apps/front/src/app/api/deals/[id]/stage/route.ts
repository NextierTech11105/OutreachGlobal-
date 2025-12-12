import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deals, dealActivities, leads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  DealStage,
  ChangeStageInput,
  VALID_STAGE_TRANSITIONS,
  DealActivity,
  DealStageChange,
} from "../../types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Change deal stage
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;
    const body: ChangeStageInput & { userId: string } = await request.json();
    const { stage: newStage, reason, finalPrice, outcomeReason, userId } = body;

    if (!newStage) {
      return NextResponse.json({ error: "stage is required" }, { status: 400 });
    }

    // Get existing deal
    const existing = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!existing.length) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const currentDeal = existing[0];
    const currentStage = currentDeal.stage as DealStage;

    // Validate stage transition
    const validTransitions = VALID_STAGE_TRANSITIONS[currentStage] || [];
    if (!validTransitions.includes(newStage)) {
      return NextResponse.json(
        {
          error: `Invalid stage transition from ${currentStage} to ${newStage}`,
          validTransitions,
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      stage: newStage,
      updatedAt: now,
    };

    // Handle closing stages
    if (newStage === "closed_won") {
      if (!finalPrice) {
        return NextResponse.json(
          { error: "finalPrice is required when closing won" },
          { status: 400 },
        );
      }

      // Calculate actual earnings
      const rate = currentDeal.monetization?.rate || 5;
      const actualEarnings = (finalPrice * rate) / 100;

      updateData.finalPrice = finalPrice;
      updateData.actualCloseDate = now;
      updateData.outcome = {
        result: "won",
        reason: reason || "Deal closed successfully",
        closedAt: now,
      };
      updateData.monetization = {
        ...currentDeal.monetization,
        actualEarnings,
      };

      // Update lead status
      await db
        .update(leads)
        .set({ status: "closed_won", updatedAt: new Date() })
        .where(eq(leads.id, currentDeal.leadId));
    } else if (newStage === "closed_lost") {
      updateData.actualCloseDate = now;
      updateData.outcome = {
        result: "lost",
        reason: outcomeReason || reason || "Deal lost",
        closedAt: now,
      };

      // Update lead status
      await db
        .update(leads)
        .set({ status: "closed_lost", updatedAt: new Date() })
        .where(eq(leads.id, currentDeal.leadId));
    }

    // Update deal
    await db.update(deals).set(updateData).where(eq(deals.id, dealId));

    // Log stage change activity
    const stageChangeActivity: DealActivity = {
      id: uuidv4(),
      dealId,
      type: "stage_change",
      description: `Stage changed from ${currentStage} to ${newStage}${reason ? `: ${reason}` : ""}`,
      metadata: {
        fromStage: currentStage,
        toStage: newStage,
        reason,
        finalPrice,
      },
      userId: userId || "system",
      createdAt: now,
    };

    await db.insert(dealActivities).values(stageChangeActivity);

    // Get updated deal
    const updated = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    // Build stage change record for response
    const stageChange: DealStageChange = {
      dealId,
      fromStage: currentStage,
      toStage: newStage,
      reason,
      changedBy: userId || "system",
      changedAt: now,
    };

    return NextResponse.json({
      success: true,
      deal: updated[0],
      stageChange,
      message: `Deal moved to ${newStage}`,
    });
  } catch (error) {
    console.error("[Deals] Stage change error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to change stage",
      },
      { status: 500 },
    );
  }
}

// GET - Get stage history for a deal
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;

    // Get all stage change activities
    const stageChanges = await db
      .select()
      .from(dealActivities)
      .where(eq(dealActivities.dealId, dealId))
      .orderBy(dealActivities.createdAt);

    const history = stageChanges
      .filter((a) => a.type === "stage_change")
      .map((a) => ({
        fromStage: (a.metadata as Record<string, unknown>)?.fromStage,
        toStage: (a.metadata as Record<string, unknown>)?.toStage,
        reason: (a.metadata as Record<string, unknown>)?.reason,
        changedBy: a.userId,
        changedAt: a.createdAt,
      }));

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("[Deals] Get stage history error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get stage history",
      },
      { status: 500 },
    );
  }
}
