import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamWorkflows } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/t/[team]/workflows/[id] - Get single workflow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ team: string; id: string }> },
) {
  try {
    const { team: teamId, id: workflowId } = await params;

    if (!teamId || !workflowId) {
      return NextResponse.json(
        { error: "Team ID and Workflow ID are required" },
        { status: 400 },
      );
    }

    const [workflow] = await db
      .select()
      .from(teamWorkflows)
      .where(
        and(eq(teamWorkflows.id, workflowId), eq(teamWorkflows.teamId, teamId)),
      );

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: workflow });
  } catch (error) {
    console.error("Get workflow error:", error);
    return NextResponse.json(
      { error: "Failed to get workflow", details: String(error) },
      { status: 500 },
    );
  }
}

// PATCH /api/t/[team]/workflows/[id] - Update workflow
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ team: string; id: string }> },
) {
  try {
    const { team: teamId, id: workflowId } = await params;
    const body = await request.json();

    if (!teamId || !workflowId) {
      return NextResponse.json(
        { error: "Team ID and Workflow ID are required" },
        { status: 400 },
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.stage !== undefined) updateData.stage = body.stage;
    if (body.trigger !== undefined) updateData.trigger = body.trigger;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.config !== undefined) updateData.config = body.config;
    if (body.lastRunAt !== undefined) updateData.lastRunAt = body.lastRunAt;
    if (body.runsCount !== undefined) updateData.runsCount = body.runsCount;

    const [updatedWorkflow] = await db
      .update(teamWorkflows)
      .set(updateData)
      .where(
        and(eq(teamWorkflows.id, workflowId), eq(teamWorkflows.teamId, teamId)),
      )
      .returning();

    if (!updatedWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: updatedWorkflow });
  } catch (error) {
    console.error("Update workflow error:", error);
    return NextResponse.json(
      { error: "Failed to update workflow", details: String(error) },
      { status: 500 },
    );
  }
}

// DELETE /api/t/[team]/workflows/[id] - Delete workflow
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ team: string; id: string }> },
) {
  try {
    const { team: teamId, id: workflowId } = await params;

    if (!teamId || !workflowId) {
      return NextResponse.json(
        { error: "Team ID and Workflow ID are required" },
        { status: 400 },
      );
    }

    const [deletedWorkflow] = await db
      .delete(teamWorkflows)
      .where(
        and(eq(teamWorkflows.id, workflowId), eq(teamWorkflows.teamId, teamId)),
      )
      .returning();

    if (!deletedWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Workflow deleted successfully",
    });
  } catch (error) {
    console.error("Delete workflow error:", error);
    return NextResponse.json(
      { error: "Failed to delete workflow", details: String(error) },
      { status: 500 },
    );
  }
}
