import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deals, dealActivities, leads } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { UpdateDealInput, DealActivity } from "../types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single deal with activities
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;

    // Get deal
    const deal = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!deal.length) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Get activities
    const activities = await db
      .select()
      .from(dealActivities)
      .where(eq(dealActivities.dealId, dealId))
      .orderBy(desc(dealActivities.createdAt))
      .limit(50);

    // Get associated lead
    const lead = await db
      .select()
      .from(leads)
      .where(eq(leads.id, deal[0].leadId))
      .limit(1);

    return NextResponse.json({
      success: true,
      deal: deal[0],
      activities,
      lead: lead[0] || null,
    });
  } catch (error) {
    console.error("[Deals] Get error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get deal" },
      { status: 500 },
    );
  }
}

// PATCH - Update deal
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;
    const body: UpdateDealInput & { userId: string } = await request.json();
    const { userId, ...updates } = body;

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

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.estimatedValue !== undefined) {
      updateData.estimatedValue = updates.estimatedValue;
      // Recalculate earnings
      const rate = currentDeal.monetization?.rate || 5;
      updateData.monetization = {
        ...currentDeal.monetization,
        estimatedEarnings: (updates.estimatedValue * rate) / 100,
      };
    }
    if (updates.askingPrice !== undefined)
      updateData.askingPrice = updates.askingPrice;
    if (updates.offerPrice !== undefined)
      updateData.offerPrice = updates.offerPrice;
    if (updates.expectedCloseDate !== undefined)
      updateData.expectedCloseDate = updates.expectedCloseDate;
    if (updates.assignedTo !== undefined)
      updateData.assignedTo = updates.assignedTo;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.seller !== undefined) updateData.seller = updates.seller;
    if (updates.buyer !== undefined) updateData.buyer = updates.buyer;
    if (updates.monetization !== undefined) {
      const newRate = updates.monetization.rate;
      const value = updates.estimatedValue || currentDeal.estimatedValue;
      updateData.monetization = {
        type: updates.monetization.type,
        rate: newRate,
        estimatedEarnings: (value * newRate) / 100,
      };
    }

    // Update deal
    await db.update(deals).set(updateData).where(eq(deals.id, dealId));

    // Log activity
    const activity: DealActivity = {
      id: uuidv4(),
      dealId,
      type: "note",
      description: `Deal updated: ${Object.keys(updates).join(", ")}`,
      userId: userId || "system",
      createdAt: new Date().toISOString(),
    };

    await db.insert(dealActivities).values(activity);

    // Get updated deal
    const updated = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    return NextResponse.json({
      success: true,
      deal: updated[0],
      message: "Deal updated successfully",
    });
  } catch (error) {
    console.error("[Deals] Update error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update deal",
      },
      { status: 500 },
    );
  }
}

// DELETE - Delete deal (soft delete by moving to closed_lost)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get("hard") === "true";
    const reason = searchParams.get("reason") || "Deal deleted";

    // Get existing deal
    const existing = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!existing.length) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    if (hardDelete) {
      // Hard delete - remove from database
      await db.delete(dealActivities).where(eq(dealActivities.dealId, dealId));
      await db.delete(deals).where(eq(deals.id, dealId));

      // Remove deal reference from lead
      await db
        .update(leads)
        .set({ dealId: null, status: "lost" })
        .where(eq(leads.dealId, dealId));

      return NextResponse.json({
        success: true,
        message: "Deal permanently deleted",
      });
    } else {
      // Soft delete - move to closed_lost
      const now = new Date().toISOString();

      await db
        .update(deals)
        .set({
          stage: "closed_lost",
          outcome: {
            result: "lost",
            reason,
            closedAt: now,
          },
          updatedAt: now,
        })
        .where(eq(deals.id, dealId));

      // Log activity
      const activity: DealActivity = {
        id: uuidv4(),
        dealId,
        type: "stage_change",
        description: `Deal closed as lost: ${reason}`,
        userId: "system",
        createdAt: now,
      };

      await db.insert(dealActivities).values(activity);

      return NextResponse.json({
        success: true,
        message: "Deal closed as lost",
      });
    }
  } catch (error) {
    console.error("[Deals] Delete error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete deal",
      },
      { status: 500 },
    );
  }
}
