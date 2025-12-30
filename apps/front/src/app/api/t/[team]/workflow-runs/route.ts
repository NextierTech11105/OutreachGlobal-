import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflowRuns, teamWorkflows } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

// GET /api/t/[team]/workflow-runs - List workflow runs for team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ team: string }> },
) {
  try {
    const { team: teamId } = await params;
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get("workflowId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 },
      );
    }

    const query = db
      .select({
        run: workflowRuns,
        workflowName: teamWorkflows.name,
      })
      .from(workflowRuns)
      .leftJoin(teamWorkflows, eq(workflowRuns.workflowId, teamWorkflows.id))
      .where(eq(workflowRuns.teamId, teamId))
      .orderBy(desc(workflowRuns.createdAt))
      .limit(limit);

    const runs = await query;

    // Filter in-memory if needed (Drizzle doesn't chain where easily)
    let filteredRuns = runs;
    if (workflowId) {
      filteredRuns = filteredRuns.filter(
        (r) => r.run.workflowId === workflowId,
      );
    }
    if (status) {
      filteredRuns = filteredRuns.filter((r) => r.run.status === status);
    }

    return NextResponse.json({
      success: true,
      data: filteredRuns.map((r) => ({
        ...r.run,
        workflowName: r.workflowName,
      })),
      count: filteredRuns.length,
    });
  } catch (error) {
    console.error("Get workflow runs error:", error);
    return NextResponse.json(
      { error: "Failed to get workflow runs", details: String(error) },
      { status: 500 },
    );
  }
}

// POST /api/t/[team]/workflow-runs - Create a workflow run (trigger execution)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ team: string }> },
) {
  try {
    const { team: teamId } = await params;
    const body = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 },
      );
    }

    const { workflowId, inputData } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: "Workflow ID is required" },
        { status: 400 },
      );
    }

    // Verify workflow exists and belongs to team
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

    const id = `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

    const [newRun] = await db
      .insert(workflowRuns)
      .values({
        id,
        workflowId,
        teamId,
        status: "pending",
        inputData: inputData || null,
        createdAt: now,
      })
      .returning();

    // Update workflow's run count
    await db
      .update(teamWorkflows)
      .set({
        runsCount: (workflow.runsCount || 0) + 1,
        lastRunAt: now,
        updatedAt: now,
      })
      .where(eq(teamWorkflows.id, workflowId));

    return NextResponse.json({ success: true, data: newRun }, { status: 201 });
  } catch (error) {
    console.error("Create workflow run error:", error);
    return NextResponse.json(
      { error: "Failed to create workflow run", details: String(error) },
      { status: 500 },
    );
  }
}
