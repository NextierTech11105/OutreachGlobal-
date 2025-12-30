import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflowRuns, teamWorkflows } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/t/[team]/workflow-runs/[id] - Get single run with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ team: string; id: string }> }
) {
  try {
    const { team: teamId, id: runId } = await params;

    if (!teamId || !runId) {
      return NextResponse.json(
        { error: "Team ID and Run ID are required" },
        { status: 400 }
      );
    }

    const [result] = await db
      .select({
        run: workflowRuns,
        workflow: teamWorkflows,
      })
      .from(workflowRuns)
      .leftJoin(teamWorkflows, eq(workflowRuns.workflowId, teamWorkflows.id))
      .where(
        and(
          eq(workflowRuns.id, runId),
          eq(workflowRuns.teamId, teamId)
        )
      );

    if (!result) {
      return NextResponse.json(
        { error: "Run not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result.run,
        workflow: result.workflow,
      },
    });
  } catch (error) {
    console.error("Get workflow run error:", error);
    return NextResponse.json(
      { error: "Failed to get workflow run", details: String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/t/[team]/workflow-runs/[id] - Update run status/data
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ team: string; id: string }> }
) {
  try {
    const { team: teamId, id: runId } = await params;
    const body = await request.json();

    if (!teamId || !runId) {
      return NextResponse.json(
        { error: "Team ID and Run ID are required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "running") {
        updateData.startedAt = new Date();
      } else if (body.status === "completed" || body.status === "failed") {
        updateData.completedAt = new Date();
      }
    }
    if (body.leadsProcessed !== undefined) updateData.leadsProcessed = body.leadsProcessed;
    if (body.leadsSuccessful !== undefined) updateData.leadsSuccessful = body.leadsSuccessful;
    if (body.leadsFailed !== undefined) updateData.leadsFailed = body.leadsFailed;
    if (body.outputData !== undefined) updateData.outputData = body.outputData;
    if (body.errorMessage !== undefined) updateData.errorMessage = body.errorMessage;

    const [updatedRun] = await db
      .update(workflowRuns)
      .set(updateData)
      .where(
        and(
          eq(workflowRuns.id, runId),
          eq(workflowRuns.teamId, teamId)
        )
      )
      .returning();

    if (!updatedRun) {
      return NextResponse.json(
        { error: "Run not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedRun });
  } catch (error) {
    console.error("Update workflow run error:", error);
    return NextResponse.json(
      { error: "Failed to update workflow run", details: String(error) },
      { status: 500 }
    );
  }
}
