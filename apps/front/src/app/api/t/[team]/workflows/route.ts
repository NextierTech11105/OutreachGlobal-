import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamWorkflows } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

// GET /api/t/[team]/workflows - List workflows for team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ team: string }> },
) {
  try {
    const { team: teamId } = await params;

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 },
      );
    }

    const workflows = await db
      .select()
      .from(teamWorkflows)
      .where(eq(teamWorkflows.teamId, teamId))
      .orderBy(desc(teamWorkflows.createdAt));

    return NextResponse.json({
      success: true,
      data: workflows,
      count: workflows.length,
    });
  } catch (error) {
    console.error("Get workflows error:", error);
    return NextResponse.json(
      { error: "Failed to get workflows", details: String(error) },
      { status: 500 },
    );
  }
}

// POST /api/t/[team]/workflows - Create workflow
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

    const { name, description, stage, trigger, status, priority, config } =
      body;

    if (!name) {
      return NextResponse.json(
        { error: "Workflow name is required" },
        { status: 400 },
      );
    }

    const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const [newWorkflow] = await db
      .insert(teamWorkflows)
      .values({
        id,
        teamId,
        name,
        description: description || null,
        stage: stage || null,
        trigger: trigger || null,
        status: status || "draft",
        priority: priority || 1,
        config: config || null,
        runsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      { success: true, data: newWorkflow },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create workflow error:", error);
    return NextResponse.json(
      { error: "Failed to create workflow", details: String(error) },
      { status: 500 },
    );
  }
}
