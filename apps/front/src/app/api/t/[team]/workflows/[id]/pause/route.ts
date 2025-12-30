import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamWorkflows } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// POST /api/t/[team]/workflows/[id]/pause - Pause a workflow (set to draft)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ team: string; id: string }> }
) {
  try {
    const { team: teamId, id: workflowId } = await params;

    if (!teamId || !workflowId) {
      return NextResponse.json(
        { error: "Team ID and Workflow ID are required" },
        { status: 400 }
      );
    }

    const [updatedWorkflow] = await db
      .update(teamWorkflows)
      .set({
        status: "draft",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(teamWorkflows.id, workflowId),
          eq(teamWorkflows.teamId, teamId)
        )
      )
      .returning();

    if (!updatedWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Workflow paused successfully",
      data: updatedWorkflow,
    });
  } catch (error) {
    console.error("Pause workflow error:", error);
    return NextResponse.json(
      { error: "Failed to pause workflow", details: String(error) },
      { status: 500 }
    );
  }
}
