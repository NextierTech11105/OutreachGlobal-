import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflowStageConfigs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/t/[team]/workflow-stages/[id] - Get single stage config
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ team: string; id: string }> },
) {
  try {
    const { team: teamId, id: stageId } = await params;

    if (!teamId || !stageId) {
      return NextResponse.json(
        { error: "Team ID and Stage ID are required" },
        { status: 400 },
      );
    }

    const [stage] = await db
      .select()
      .from(workflowStageConfigs)
      .where(
        and(
          eq(workflowStageConfigs.id, stageId),
          eq(workflowStageConfigs.teamId, teamId),
        ),
      );

    if (!stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: stage });
  } catch (error) {
    console.error("Get stage error:", error);
    return NextResponse.json(
      { error: "Failed to get stage", details: String(error) },
      { status: 500 },
    );
  }
}

// PATCH /api/t/[team]/workflow-stages/[id] - Update stage config
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ team: string; id: string }> },
) {
  try {
    const { team: teamId, id: stageId } = await params;
    const body = await request.json();

    if (!teamId || !stageId) {
      return NextResponse.json(
        { error: "Team ID and Stage ID are required" },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.defaultAgent !== undefined)
      updateData.defaultAgent = body.defaultAgent;
    if (body.triggerMode !== undefined)
      updateData.triggerMode = body.triggerMode;
    if (body.delayDays !== undefined) updateData.delayDays = body.delayDays;
    if (body.campaignType !== undefined)
      updateData.campaignType = body.campaignType;
    if (body.usesDifferentNumber !== undefined)
      updateData.usesDifferentNumber = body.usesDifferentNumber;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.color !== undefined) updateData.color = body.color;

    const [updatedStage] = await db
      .update(workflowStageConfigs)
      .set(updateData)
      .where(
        and(
          eq(workflowStageConfigs.id, stageId),
          eq(workflowStageConfigs.teamId, teamId),
        ),
      )
      .returning();

    if (!updatedStage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedStage });
  } catch (error) {
    console.error("Update stage error:", error);
    return NextResponse.json(
      { error: "Failed to update stage", details: String(error) },
      { status: 500 },
    );
  }
}

// DELETE /api/t/[team]/workflow-stages/[id] - Delete stage config
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ team: string; id: string }> },
) {
  try {
    const { team: teamId, id: stageId } = await params;

    if (!teamId || !stageId) {
      return NextResponse.json(
        { error: "Team ID and Stage ID are required" },
        { status: 400 },
      );
    }

    const [deletedStage] = await db
      .delete(workflowStageConfigs)
      .where(
        and(
          eq(workflowStageConfigs.id, stageId),
          eq(workflowStageConfigs.teamId, teamId),
        ),
      )
      .returning();

    if (!deletedStage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Stage deleted successfully",
    });
  } catch (error) {
    console.error("Delete stage error:", error);
    return NextResponse.json(
      { error: "Failed to delete stage", details: String(error) },
      { status: 500 },
    );
  }
}
